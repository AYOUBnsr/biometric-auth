from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql+asyncpg://biometric:biometric_pass@localhost:5432/biometric_auth"
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    FACE_SIMILARITY_THRESHOLD: float = 0.40
    VOICE_SIMILARITY_THRESHOLD: float = 0.70
    ENABLE_LIVENESS_DETECTION: bool = False

    FRONTEND_URL: str = "http://localhost:5173"
    SPEECHBRAIN_MODEL: str = "speechbrain/spkrec-ecapa-voxceleb"


settings = Settings()
