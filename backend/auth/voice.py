"""
Voice recognition module using SpeechBrain ECAPA-TDNN speaker verification.

Model: speechbrain/spkrec-ecapa-voxceleb
Embedding: 192-d d-vector (x-vector style)
Similarity: cosine similarity
"""
from __future__ import annotations

import io
import logging
import os
import tempfile
from pathlib import Path
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)

_encoder = None
_SAVEDIR = Path("/home/WGr1mmer/.cache/speechbrain_models")


def _patch_torch_amp():
    """Patch missing torch.amp attributes for SpeechBrain 1.1.0 + torch 2.2.x compatibility."""
    import torch
    if not hasattr(torch.amp, 'custom_fwd'):
        torch.amp.custom_fwd = lambda f=None, **kwargs: f if f else lambda fn: fn
    if not hasattr(torch.amp, 'custom_bwd'):
        torch.amp.custom_bwd = lambda f=None, **kwargs: f if f else lambda fn: fn


def _get_encoder():
    global _encoder
    if _encoder is None:
        try:
            import torch
            from speechbrain.inference.speaker import EncoderClassifier

            _patch_torch_amp()
            _SAVEDIR.mkdir(parents=True, exist_ok=True)
            logger.info("Loading SpeechBrain ECAPA model (first run may download ~400MB)...")
            _encoder = EncoderClassifier.from_hparams(
                source="speechbrain/spkrec-ecapa-voxceleb",
                savedir=str(_SAVEDIR / "ecapa-voxceleb"),
                run_opts={"device": "cpu"},
            )
            logger.info("SpeechBrain model loaded successfully.")
        except Exception as exc:
            logger.error("Failed to load SpeechBrain model: %s", exc)
            raise
    return _encoder


# -- Audio decoding ------------------------------------------------------------

def load_audio_from_bytes(audio_bytes: bytes, target_sr: int = 16000) -> np.ndarray:
    """
    Load audio bytes (WebM, WAV, OGG) and resample to target_sr.
    Returns float32 mono numpy array.
    """
    import soundfile as sf
    import librosa

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        # Try direct soundfile first (WAV/FLAC/OGG)
        try:
            audio_buf = io.BytesIO(audio_bytes)
            data, sr = sf.read(audio_buf, dtype="float32")
        except Exception:
            # Fall back to librosa which handles more formats including WebM
            with open(tmp_path, "wb") as f:
                f.write(audio_bytes)
            data, sr = librosa.load(tmp_path, sr=None, mono=True, dtype=np.float32)

        # Convert to mono if stereo
        if data.ndim > 1:
            data = data.mean(axis=1)

        # Resample if needed
        if sr != target_sr:
            data = librosa.resample(data, orig_sr=sr, target_sr=target_sr)

        return data.astype(np.float32)
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


# -- Embedding extraction ------------------------------------------------------

def extract_voice_embedding(audio_bytes: bytes) -> Optional[np.ndarray]:
    """
    Extract 192-d speaker embedding from raw audio bytes.
    Returns L2-normalised float32 numpy array, or None on failure.
    """
    import torch

    try:
        audio_data = load_audio_from_bytes(audio_bytes)

        if len(audio_data) < 16000:  # Less than 1 second
            logger.warning("Audio too short for reliable speaker embedding (< 1s)")
            return None

        _patch_torch_amp()
        encoder = _get_encoder()

        audio_tensor = torch.tensor(audio_data).unsqueeze(0)  # (1, T)
        wav_lens = torch.tensor([1.0])

        with torch.no_grad():
            embeddings = encoder.encode_batch(audio_tensor, wav_lens)

        embedding = embeddings.squeeze().cpu().numpy().astype(np.float32)

        # L2 normalise
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm

        return embedding

    except Exception as exc:
        logger.error("Voice embedding extraction failed: %s", exc)
        return None


# -- Similarity ----------------------------------------------------------------

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.clip(np.dot(a, b), -1.0, 1.0))


def compare_voice(
    stored_embedding: list[float],
    query_embedding: np.ndarray,
    threshold: float,
) -> tuple[bool, float]:
    """
    Compare stored (pgvector list) against live embedding.
    Returns (match: bool, confidence: float 0-1).
    """
    stored = np.array(stored_embedding, dtype=np.float32)
    norm = np.linalg.norm(stored)
    if norm > 0:
        stored = stored / norm

    similarity = cosine_similarity(stored, query_embedding)
    match = similarity >= threshold
    return match, similarity