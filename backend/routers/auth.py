"""
Authentication router.

POST /auth/register        — register user + biometric data
POST /auth/login/face      — step 1: face verification
POST /auth/login/voice     — step 2: voice verification → JWT
GET  /auth/me              — profile (JWT protected)
POST /auth/logout          — revoke JWT
"""
from __future__ import annotations

import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import numpy as np
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app_config import settings
from auth.face import (
    average_embeddings,
    basic_liveness_check,
    compare_face,
    decode_image_bytes,
    extract_face_embedding,
)
from auth.voice import compare_voice, extract_voice_embedding
from auth.jwt import (
    create_access_token,
    get_current_user_payload,
    revoke_token,
)
from database import get_db
from models import PendingSession, RevokedToken, User
from passlib.context import CryptContext
from schemas import (
    FaceLoginResponse,
    LogoutResponse,
    RegisterRequest,
    RegisterResponse,
    UserProfile,
    VoiceLoginResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

PENDING_SESSION_TTL_MINUTES = 5


# ── Helpers ───────────────────────────────────────────────────────────────────

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


async def get_user_by_username(username: str, db: AsyncSession) -> Optional[User]:
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def get_user_by_id(user_id: uuid.UUID, db: AsyncSession) -> Optional[User]:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


# ── POST /auth/register ───────────────────────────────────────────────────────

@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    face_frames: list[UploadFile] = File(..., description="3–5 JPEG/PNG face frames"),
    voice_sample: UploadFile = File(..., description="5–10 second WAV/WebM audio"),
    db: AsyncSession = Depends(get_db),
):
    """Register a new user with face + voice biometrics and a text password."""

    # Validate uniqueness
    existing = await db.execute(
        select(User).where((User.username == username) | (User.email == email))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Username or email already registered")

    if len(face_frames) < 2:
        raise HTTPException(status_code=422, detail="Please provide at least 2 face frames")

    # ── Extract face embeddings ────────────────────────────────────────────────
    raw_frames: list[bytes] = [await f.read() for f in face_frames]
    frame_arrays: list[np.ndarray] = []
    embeddings: list[np.ndarray] = []

    for raw in raw_frames:
        arr = decode_image_bytes(raw)
        frame_arrays.append(arr)
        emb = extract_face_embedding(arr)
        if emb is not None:
            embeddings.append(emb)

    if len(embeddings) < 1:
        raise HTTPException(
            status_code=422,
            detail="No face detected in the provided frames. Please ensure good lighting.",
        )

    face_emb = average_embeddings(embeddings)

    # ── Extract voice embedding ───────────────────────────────────────────────
    voice_bytes = await voice_sample.read()
    voice_emb = extract_voice_embedding(voice_bytes)
    if voice_emb is None:
        raise HTTPException(
            status_code=422,
            detail="Could not extract voice embedding. Ensure the audio is at least 3 seconds long.",
        )

    # ── Persist user ──────────────────────────────────────────────────────────
    user = User(
        username=username,
        email=email,
        hashed_password=hash_password(password),
        face_embedding=face_emb.tolist(),
        voice_embedding=voice_emb.tolist(),
        biometric_registered=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    return RegisterResponse(
        user_id=user.id,
        username=user.username,
        message="Registration successful. Biometric data enrolled.",
    )


# ── POST /auth/login/face ─────────────────────────────────────────────────────

@router.post("/login/face", response_model=FaceLoginResponse)
async def login_face(
    username: str = Form(...),
    face_frame: UploadFile = File(..., description="Single JPEG/PNG face frame"),
    liveness_frames: Optional[list[UploadFile]] = File(
        None, description="Extra frames for liveness (optional)"
    ),
    db: AsyncSession = Depends(get_db),
):
    """
    Step 1 of biometric login: verify face identity.
    Returns a short-lived session_token to be used in /login/voice.
    """
    user = await get_user_by_username(username, db)
    if not user or not user.is_active:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.biometric_registered or user.face_embedding is None:
        raise HTTPException(status_code=400, detail="Biometric data not enrolled for this user")

    frame_bytes = await face_frame.read()
    frame_arr = decode_image_bytes(frame_bytes)
    query_emb = extract_face_embedding(frame_arr)

    if query_emb is None:
        raise HTTPException(status_code=422, detail="No face detected in the provided image")

    matched, confidence = compare_face(
        user.face_embedding, query_emb, settings.FACE_SIMILARITY_THRESHOLD
    )

    liveness_passed: Optional[bool] = None
    if settings.ENABLE_LIVENESS_DETECTION:
        all_frames = [frame_arr]
        if liveness_frames:
            for lf in liveness_frames:
                all_frames.append(decode_image_bytes(await lf.read()))
        liveness_passed = basic_liveness_check(all_frames)
        if not liveness_passed:
            raise HTTPException(status_code=403, detail="Liveness check failed (static image detected)")

    if not matched:
        raise HTTPException(
            status_code=401,
            detail=f"Face verification failed (confidence: {confidence:.3f}, threshold: {settings.FACE_SIMILARITY_THRESHOLD})",
        )

    # Create a pending session token
    session_token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=PENDING_SESSION_TTL_MINUTES)

    pending = PendingSession(
        session_token=session_token,
        user_id=user.id,
        face_confidence=confidence,
        face_verified=True,
        expires_at=expires_at,
    )
    db.add(pending)
    await db.commit()

    return FaceLoginResponse(
        session_token=session_token,
        face_confidence=confidence,
        message="Face verified. Proceed to voice verification.",
        liveness_passed=liveness_passed,
    )


# ── POST /auth/login/voice ────────────────────────────────────────────────────

@router.post("/login/voice", response_model=VoiceLoginResponse)
async def login_voice(
    session_token: str = Form(...),
    voice_sample: UploadFile = File(..., description="5–10s WAV/WebM audio clip"),
    db: AsyncSession = Depends(get_db),
):
    """
    Step 2 of biometric login: verify voice identity.
    Requires the session_token from /login/face.
    Issues a full JWT on success.
    """
    # Validate pending session
    result = await db.execute(
        select(PendingSession).where(
            PendingSession.session_token == session_token,
            PendingSession.used == False,  # noqa: E712
        )
    )
    pending = result.scalar_one_or_none()
    if not pending:
        logger.warning("Invalid or expired voice login session token: %s", session_token)
        raise HTTPException(status_code=401, detail="Invalid or expired session token")

    if datetime.now(timezone.utc) > pending.expires_at:
        logger.warning("Expired pending session token: %s", session_token)
        raise HTTPException(status_code=401, detail="Session token expired. Please restart login.")

    if not pending.face_verified:
        logger.warning("Pending session token missing face verification: %s", session_token)
        raise HTTPException(status_code=401, detail="Face step not completed")

    user = await get_user_by_id(pending.user_id, db)
    if not user or not user.is_active:
        raise HTTPException(status_code=404, detail="User not found")

    if user.voice_embedding is None:
        raise HTTPException(status_code=400, detail="Voice biometric not enrolled")

    voice_bytes = await voice_sample.read()
    query_emb = extract_voice_embedding(voice_bytes)

    if query_emb is None:
        raise HTTPException(status_code=422, detail="Could not process voice sample")

    matched, voice_confidence = compare_voice(
        user.voice_embedding, query_emb, settings.VOICE_SIMILARITY_THRESHOLD
    )

    if not matched:
        logger.warning(
            "Voice verification failed for user %s: confidence=%s threshold=%s",
            user.username,
            voice_confidence,
            settings.VOICE_SIMILARITY_THRESHOLD,
        )
        raise HTTPException(
            status_code=401,
            detail=f"Voice verification failed (confidence: {voice_confidence:.3f}, threshold: {settings.VOICE_SIMILARITY_THRESHOLD:.2f})",
        )

    # Mark session as used
    pending.used = True
    await db.commit()

    # Issue JWT
    extra_claims = {
        "username": user.username,
        "email": user.email,
        "face_confidence": pending.face_confidence,
        "voice_confidence": voice_confidence,
    }
    token, expires_at = create_access_token(
        subject=str(user.id), extra_claims=extra_claims
    )
    expires_in = int((expires_at - datetime.now(timezone.utc)).total_seconds())

    return VoiceLoginResponse(
        access_token=token,
        token_type="bearer",
        expires_in=expires_in,
        face_confidence=pending.face_confidence or 0.0,
        voice_confidence=voice_confidence,
        username=user.username,
        user_id=str(user.id),
    )


# ── GET /auth/me ──────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserProfile)
async def get_me(
    payload: dict = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
):
    user_id = uuid.UUID(payload["sub"])
    user = await get_user_by_id(user_id, db)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    exp_ts = payload.get("exp")
    token_expires_at = datetime.fromtimestamp(exp_ts, tz=timezone.utc) if exp_ts else None

    return UserProfile(
        user_id=user.id,
        username=user.username,
        email=user.email,
        biometric_registered=user.biometric_registered,
        created_at=user.created_at,
        face_confidence=payload.get("face_confidence"),
        voice_confidence=payload.get("voice_confidence"),
        token_expires_at=token_expires_at,
    )


# ── POST /auth/logout ─────────────────────────────────────────────────────────

@router.post("/logout", response_model=LogoutResponse)
async def logout(
    payload: dict = Depends(get_current_user_payload),
    db: AsyncSession = Depends(get_db),
):
    jti = payload.get("jti")
    if not jti:
        raise HTTPException(status_code=400, detail="Token missing JTI claim")

    exp_ts = payload.get("exp")
    expires_at = datetime.fromtimestamp(exp_ts, tz=timezone.utc) if exp_ts else datetime.now(timezone.utc)

    await revoke_token(jti=jti, expires_at=expires_at, reason="user_logout", db=db)

    return LogoutResponse(message="Logged out successfully. Token revoked.")
