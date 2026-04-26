import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: BASE_URL,
})

// Attach JWT if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto-clear on 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token')
      localStorage.removeItem('token_meta')
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────

/**
 * Register user with face frames + voice sample.
 * @param {string} username
 * @param {string} email
 * @param {string} password
 * @param {Blob[]} faceFrames  - array of image blobs (JPEG)
 * @param {Blob} voiceSample   - audio blob (WebM/WAV)
 */
export async function registerUser(username, email, password, faceFrames, voiceSample) {
  const fd = new FormData()
  fd.append('username', username)
  fd.append('email', email)
  fd.append('password', password)
  faceFrames.forEach((blob, i) => fd.append('face_frames', blob, `frame_${i}.jpg`))
  fd.append('voice_sample', voiceSample, 'voice.wav')
  const { data } = await api.post('/auth/register', fd)
  return data
}

/**
 * Step 1: face login.
 * @param {string} username
 * @param {Blob} faceFrame
 * @returns {{ session_token, face_confidence, message }}
 */
export async function loginFace(username, faceFrame) {
  const fd = new FormData()
  fd.append('username', username)
  fd.append('face_frame', faceFrame, 'face.jpg')
  const { data } = await api.post('/auth/login/face', fd)
  return data
}

/**
 * Step 2: voice login.
 * @param {string} sessionToken
 * @param {Blob} voiceSample
 * @returns {{ access_token, face_confidence, voice_confidence, username, ... }}
 */
export async function loginVoice(sessionToken, voiceSample) {
  const fd = new FormData()
  fd.append('session_token', sessionToken)
  fd.append('voice_sample', voiceSample, 'voice.wav')
  const { data } = await api.post('/auth/login/voice', fd)
  return data
}

/** Fetch current user profile (requires JWT). */
export async function getMe() {
  const { data } = await api.get('/auth/me')
  return data
}

/** Revoke JWT and clear local storage. */
export async function logout() {
  try {
    await api.post('/auth/logout')
  } finally {
    localStorage.removeItem('access_token')
    localStorage.removeItem('token_meta')
  }
}

export default api
