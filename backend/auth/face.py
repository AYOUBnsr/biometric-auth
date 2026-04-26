"""
Face recognition module using DeepFace.

Embedding model: Facenet512 (512-d vectors, stored in pgvector).
Distance metric: cosine similarity.
"""
from __future__ import annotations

import base64
import io
import logging
from typing import Optional

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# Lazy-load DeepFace to avoid slow startup
_deepface = None


def _get_deepface():
    global _deepface
    if _deepface is None:
        from deepface import DeepFace as _df
        _deepface = _df
    return _deepface


# ── Image decoding ─────────────────────────────────────────────────────────────

def decode_image_bytes(data: bytes) -> np.ndarray:
    """Convert raw bytes (JPEG/PNG) → numpy RGB array."""
    img = Image.open(io.BytesIO(data)).convert("RGB")
    return np.array(img)


def decode_base64_image(b64_string: str) -> np.ndarray:
    """Accept 'data:image/jpeg;base64,...' or plain base64."""
    if "," in b64_string:
        b64_string = b64_string.split(",", 1)[1]
    raw = base64.b64decode(b64_string)
    return decode_image_bytes(raw)


# ── Embedding extraction ──────────────────────────────────────────────────────

def extract_face_embedding(image: np.ndarray) -> Optional[np.ndarray]:
    import cv2
    cv2.imwrite("/tmp/debug_face.jpg", cv2.cvtColor(image, cv2.COLOR_RGB2BGR))
    logger.debug("DEBUG image shape: %s, dtype: %s", image.shape, image.dtype)
    """
    Extract a 512-d Facenet512 embedding from a numpy image array.
    Returns None if no face is detected.
    """
    DeepFace = _get_deepface()
    detector_backends = ["ssd", "mtcnn", "dlib", "opencv"]

    for backend in detector_backends:
        try:
            result = DeepFace.represent(
                img_path=image,
                model_name="Facenet512",
                detector_backend=backend,
                enforce_detection=True,
                align=True,
            )
            if result and len(result) > 0:
                embedding = np.array(result[0]["embedding"], dtype=np.float32)
                norm = np.linalg.norm(embedding)
                if norm > 0:
                    embedding = embedding / norm
                return embedding
        except Exception as exc:
            logger.warning(
                "Face embedding extraction failed with backend %s: %s",
                backend,
                exc,
            )

    logger.warning(
        "Face embedding extraction failed for all detector backends. "
        "Please ensure the provided image contains a clear face.",
    )
    return None


def average_embeddings(embeddings: list[np.ndarray]) -> np.ndarray:
    """Average multiple frame embeddings and re-normalise."""
    stacked = np.stack(embeddings, axis=0)
    mean_emb = stacked.mean(axis=0)
    norm = np.linalg.norm(mean_emb)
    if norm > 0:
        mean_emb = mean_emb / norm
    return mean_emb


# ── Similarity ────────────────────────────────────────────────────────────────

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity in [0, 1] (already L2-normalised vectors → dot product)."""
    return float(np.clip(np.dot(a, b), -1.0, 1.0))


def compare_face(
    stored_embedding: list[float],
    query_embedding: np.ndarray,
    threshold: float,
) -> tuple[bool, float]:
    """
    Compare stored (pgvector list) against query (np.ndarray).
    Returns (match: bool, confidence: float 0-1).
    """
    stored = np.array(stored_embedding, dtype=np.float32)
    stored_norm = np.linalg.norm(stored)
    if stored_norm > 0:
        stored = stored / stored_norm

    similarity = cosine_similarity(stored, query_embedding)
    match = similarity >= threshold
    return match, similarity


# ── Liveness heuristic ────────────────────────────────────────────────────────

def basic_liveness_check(frames: list[np.ndarray]) -> bool:
    """
    Simple liveness heuristic: check that at least 2 frames have different
    mean pixel values (detects static image replay).
    This is NOT a production-grade anti-spoofing solution.
    """
    if len(frames) < 2:
        return True  # Can't check with single frame

    means = [frame.mean() for frame in frames]
    variance = np.var(means)
    # Some variation expected from real face under natural lighting
    return variance > 0.5
