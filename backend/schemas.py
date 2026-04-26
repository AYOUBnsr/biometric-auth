from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator


# ── Registration ──────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("username")
    @classmethod
    def username_alphanumeric(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3 or len(v) > 64:
            raise ValueError("Username must be 3–64 characters")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class RegisterResponse(BaseModel):
    user_id: uuid.UUID
    username: str
    message: str


# ── Face auth ─────────────────────────────────────────────────────────────────

class FaceLoginResponse(BaseModel):
    session_token: str
    face_confidence: float
    message: str
    liveness_passed: Optional[bool] = None


# ── Voice auth ────────────────────────────────────────────────────────────────

class VoiceLoginRequest(BaseModel):
    session_token: str


class VoiceLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    face_confidence: float
    voice_confidence: float
    username: str
    user_id: str


# ── Profile ───────────────────────────────────────────────────────────────────

class UserProfile(BaseModel):
    user_id: uuid.UUID
    username: str
    email: str
    biometric_registered: bool
    created_at: datetime
    face_confidence: Optional[float] = None
    voice_confidence: Optional[float] = None
    token_expires_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ── Logout ────────────────────────────────────────────────────────────────────

class LogoutRequest(BaseModel):
    reason: Optional[str] = "user_initiated"


class LogoutResponse(BaseModel):
    message: str


# ── Error ─────────────────────────────────────────────────────────────────────

class ErrorDetail(BaseModel):
    error: str
    detail: Optional[str] = None
