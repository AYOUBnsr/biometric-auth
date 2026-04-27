# BioAuth — Biometric Authentication System
<div align="center">
  <br />
    <a href="https://doc-sync-an.vercel.app" target="_blank">
      <img src="https://github.com/user-attachments/assets/7845b97a-0398-4b3f-a2c6-630725b4d370" alt="Project Banner">
    </a>
  <br />
</div>
  <div>
     
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://reactjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg)](https://fastapi.tiangolo.com/)

A secure, full-stack biometric authentication system featuring **facial recognition** and **voice verification** for two-factor authentication. Built with modern web technologies and machine learning models for robust identity verification.

## 🎯 Objectives

- **Secure Authentication**: Implement multi-modal biometric verification combining face and voice recognition
- **User-Friendly**: Provide an intuitive web interface for enrollment and login
- **Scalable**: Use vector databases (pgvector) for efficient similarity searches
- **Production-Ready**: Containerized deployment with Docker for easy setup
- **Privacy-Focused**: Process biometrics locally without external API dependencies

## 🛠 Technologies Used

### Backend
- **FastAPI**: High-performance async web framework for Python
- **PostgreSQL + pgvector**: Vector database for storing and querying biometric embeddings
- **DeepFace**: Facial recognition using Facenet512 model
- **SpeechBrain**: Speaker verification with ECAPA-TDNN model
- **SQLAlchemy**: ORM for database operations
- **PassLib**: Secure password hashing

### Frontend
- **React**: Component-based UI library
- **Vite**: Fast build tool and development server
- **Axios**: HTTP client for API communication
- **Framer Motion**: Smooth animations and transitions

### Infrastructure
- **Docker & Docker Compose**: Containerized deployment
- **JWT**: Token-based authentication
- **WebRTC**: Real-time camera and microphone access

## 🚀 Quick Start with Docker (Recommended)

### Prerequisites
- Docker and Docker Compose installed
- At least 4GB RAM available

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/AYOUBnsr/biometric-auth.git
   cd biometric-auth
   ```

2. **Start the services**
   ```bash
   docker-compose up --build
   ```

3. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

The first run will download ML models (~400MB), which may take a few minutes.

## 🖥 Manual Installation

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+ with pgvector extension
- System dependencies (varies by OS)

### 1. Database Setup

**Using Docker (easiest):**
```bash
docker run --name postgres-biometric -e POSTGRES_DB=biometric_auth -e POSTGRES_USER=biometric -e POSTGRES_PASSWORD=biometric_pass -p 5432:5432 -d pgvector/pgvector:pg15
```

**Manual PostgreSQL setup:**
```sql
CREATE USER biometric WITH PASSWORD 'biometric_pass';
CREATE DATABASE biometric_auth OWNER biometric;
GRANT ALL PRIVILEGES ON DATABASE biometric_auth TO biometric;
\\c biometric_auth
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database URL and secret key

# Run the server
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

## 📖 Usage Guide

### User Registration
1. Navigate to the registration page
2. Enter username, email, and password
3. Capture 4 face frames by positioning your face in the circle
4. Record a voice sample by speaking the passphrase clearly
5. Complete registration

### User Login
1. Enter your username
2. Scan your face for initial verification
3. Speak the passphrase for voice verification
4. Access granted with JWT token

### API Endpoints
- `POST /auth/register` - User registration with biometrics
- `POST /auth/login/face` - Face verification (returns session token)
- `POST /auth/login/voice` - Voice verification (returns JWT)
- `GET /auth/me` - Get user profile (requires JWT)
- `POST /auth/logout` - Logout and revoke token

## 🔧 Configuration

### Environment Variables (.env)

```env
# Database
DATABASE_URL=postgresql+asyncpg://biometric:biometric_pass@localhost:5432/biometric_auth

# Security
SECRET_KEY=your-very-long-random-secret-key-here-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Thresholds
FACE_SIMILARITY_THRESHOLD=0.40
VOICE_SIMILARITY_THRESHOLD=0.70
ENABLE_LIVENESS_DETECTION=false

# Frontend
FRONTEND_URL=http://localhost:5173

# ML Models
SPEECHBRAIN_MODEL=speechbrain/spkrec-ecapa-voxceleb
```

### Threshold Tuning
- **Face**: Lower values (e.g., 0.30) are more permissive but less secure
- **Voice**: Adjust based on your microphone quality and environment noise

## 🏗 Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   FastAPI       │
│   (Frontend)    │◄──►│   (Backend)     │
│                 │    │                 │
│ - Face Scanner  │    │ - Auth Router   │
│ - Voice Recorder│    │ - ML Models     │
│ - Dashboard     │    │ - JWT Tokens    │
└─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│ PostgreSQL +    │    │   ML Models     │
│ pgvector        │    │                 │
│                 │    │ - DeepFace      │
│ - User data     │    │ - SpeechBrain   │
│ - Embeddings    │    │                 │
└─────────────────┘    └─────────────────┘
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## ⚠️ Security Notes

- Change default passwords and secret keys in production
- Use HTTPS in production
- Regularly update ML model dependencies
- Monitor for adversarial attacks on biometric systems
- Consider additional liveness detection for high-security applications

## 📞 Support

If you encounter issues:
1. Check the API documentation at `/docs`
2. Verify your environment matches the prerequisites
3. Ensure camera and microphone permissions are granted
4. Check logs for detailed error messages

---

Built with ❤️ using modern web technologies and machine learning.

Create `backend/.env` from `backend/.env.example`:

```env
# Database
DATABASE_URL=postgresql+asyncpg://biometric:biometric_pass@localhost:5432/biometric_auth

# JWT — generate with: python -c "import secrets; print(secrets.token_hex(32))"
SECRET_KEY=your-very-long-random-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Biometric thresholds (0.0 – 1.0)
FACE_SIMILARITY_THRESHOLD=0.40
VOICE_SIMILARITY_THRESHOLD=0.75

# Liveness detection (basic heuristic, not production-grade)
ENABLE_LIVENESS_DETECTION=false

# CORS
FRONTEND_URL=http://localhost:5173

# SpeechBrain model
SPEECHBRAIN_MODEL=speechbrain/spkrec-ecapa-voxceleb
```

---

## Running with Docker (optional)

```bash
# Build and start all services
docker-compose up --build

# Frontend: http://localhost:5173
# Backend:  http://localhost:8000
# API docs: http://localhost:8000/docs
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | None | Register user with face + voice + password |
| POST | `/auth/login/face` | None | Step 1: face scan → session_token |
| POST | `/auth/login/voice` | None | Step 2: voice + session_token → JWT |
| GET | `/auth/me` | Bearer JWT | Get current user profile |
| POST | `/auth/logout` | Bearer JWT | Revoke JWT |
| GET | `/health` | None | Health check |

### Register (`multipart/form-data`)

```
username      string
email         string
password      string
face_frames   file[]   (2–5 JPEG/PNG images)
voice_sample  file     (WAV or WebM, ≥ 4 seconds)
```

### Login Face (`multipart/form-data`)

```
username    string
face_frame  file     (single JPEG/PNG)
```

### Login Voice (`multipart/form-data`)

```
session_token  string   (from /login/face)
voice_sample   file     (WAV or WebM, ≥ 3 seconds)
```

---

## Database Schema

```sql
-- Users with biometric embeddings
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username          VARCHAR(64) UNIQUE NOT NULL,
  email             VARCHAR(255) UNIQUE NOT NULL,
  hashed_password   VARCHAR(255) NOT NULL,
  face_embedding    VECTOR(512),   -- Facenet512
  voice_embedding   VECTOR(192),   -- ECAPA-TDNN
  is_active         BOOLEAN DEFAULT true,
  biometric_registered BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Two-step login state (face verified → waiting for voice)
CREATE TABLE pending_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token  VARCHAR(256) UNIQUE NOT NULL,
  user_id        UUID NOT NULL,
  face_confidence FLOAT,
  face_verified  BOOLEAN DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL,  -- 5 min TTL
  used           BOOLEAN DEFAULT false
);

-- JWT blacklist for logout
CREATE TABLE revoked_tokens (
  id          SERIAL PRIMARY KEY,
  jti         VARCHAR(256) UNIQUE NOT NULL,
  revoked_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  reason      TEXT
);
```

---

## Alembic Migrations

```bash
cd backend

# Auto-generate migration after model changes
alembic revision --autogenerate -m "describe change"

# Apply migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1
```

---

## Known Issues & Notes

### SpeechBrain / PyTorch Compatibility

- `speechbrain==1.0.0` requires `torch>=2.0`. The `requirements.txt` pins `torch==2.2.2`.
- On Arch Linux, install torch from PyPI (not `python-pytorch` from pacman) to avoid CUDA/ABI conflicts:
  ```bash
  pip install torch==2.2.2 torchaudio==2.2.2 --index-url https://download.pytorch.org/whl/cpu
  ```
- The ECAPA model downloads ~400 MB on first use from HuggingFace Hub. Set `HF_HUB_OFFLINE=1` after the first download.

### DeepFace / TensorFlow

- DeepFace pulls `tensorflow` as a dependency. On Arch, `tf-keras` must be installed separately (included in `requirements.txt`).
- If you see `No module named 'keras'`, run: `pip install tf-keras`
- For GPU acceleration: install `tensorflow-gpu` instead of `tensorflow`.

### pgvector

- The `pgvector` extension must be installed in PostgreSQL before running the app.
- Vector dimension **must match** what the model outputs. Facenet512 → 512-d, ECAPA-TDNN → 192-d.
- If you change models, drop and recreate the `users` table or write a migration to change vector dimensions.

### Audio Formats

- The frontend records in `audio/webm;codecs=opus` (Chrome/Firefox default).
- The backend uses `librosa` as a fallback decoder for WebM → float32 PCM.
- If `librosa` fails to decode, install `ffmpeg` system-wide: `sudo pacman -S ffmpeg`.

### Face Threshold Tuning

- Default threshold `0.40` (cosine similarity) works well for Facenet512 under decent lighting.
- Lower values = stricter (fewer false positives). Higher = more lenient.
- Tune via `FACE_SIMILARITY_THRESHOLD` env var without code changes.

### Liveness Detection

- The current liveness check is a **basic heuristic** (pixel variance across frames).
- For production, use a dedicated model like `Silent-Face-Anti-Spoofing` or a commercial SDK.
- Enable with `ENABLE_LIVENESS_DETECTION=true` — disabled by default.

### HTTPS in Production

- Webcam and microphone APIs require **HTTPS** in production (browser security policy).
- Use `nginx` + Let's Encrypt, or a reverse proxy like Caddy:
  ```bash
  sudo pacman -S caddy
  # Caddyfile: yourdomain.com { reverse_proxy localhost:8000 }
  ```

---

## Project Structure

```
biometric-auth/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── app_config.py        # Pydantic settings
│   ├── database.py          # SQLAlchemy async engine + init_db
│   ├── models.py            # ORM models (User, PendingSession, RevokedToken)
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── auth/
│   │   ├── face.py          # DeepFace embedding extraction + comparison
│   │   ├── voice.py         # SpeechBrain ECAPA embedding + comparison
│   │   └── jwt.py           # Token creation, validation, revocation
│   ├── routers/
│   │   └── auth.py          # All /auth/* endpoints
│   ├── alembic/             # Database migrations
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx          # Router + AuthContext
│   │   ├── main.jsx         # React entry point
│   │   ├── index.css        # Global dark theme styles
│   │   ├── api.js           # Axios client + all API calls
│   │   ├── pages/
│   │   │   ├── Register.jsx # 4-step registration wizard
│   │   │   ├── Login.jsx    # 2-step biometric login
│   │   │   └── Dashboard.jsx# Protected user dashboard
│   │   └── components/
│   │       ├── FaceScanner.jsx    # Webcam + animated scan UI
│   │       ├── VoiceRecorder.jsx  # Web Audio API waveform visualizer
│   │       ├── StepIndicator.jsx  # Animated step progress
│   │       └── ConfidenceBar.jsx  # Animated confidence score bar
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```
