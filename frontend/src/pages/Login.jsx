import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import FaceScanner from '../components/FaceScanner'
import VoiceRecorder from '../components/VoiceRecorder'
import StepIndicator from '../components/StepIndicator'
import ConfidenceBar from '../components/ConfidenceBar'
import { loginFace, loginVoice } from '../api'
import { useAuth } from '../App'

const PASSPHRASE = 'My voice is my secure password'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [step, setStep] = useState(1)           // 1=face, 2=voice, 3=done
  const [username, setUsername] = useState('')
  const [faceBlob, setFaceBlob] = useState(null)
  const [voiceBlob, setVoiceBlob] = useState(null)
  const [sessionToken, setSessionToken] = useState('')
  const [faceConf, setFaceConf] = useState(null)
  const [voiceConf, setVoiceConf] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const card = {
    background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)', padding: 32,
    backdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-card)',
  }

  const btnPrimary = (enabled) => ({
    padding: '12px 28px', borderRadius: 'var(--radius-sm)',
    background: enabled ? 'var(--accent)' : 'var(--bg-card-hover)',
    color: enabled ? '#0d0d0f' : 'var(--text-muted)',
    border: 'none', fontWeight: 700, fontSize: 14,
    cursor: enabled ? 'pointer' : 'not-allowed', width: '100%',
  })

  /* ── Step 1: Face ── */
  const handleFaceCapture = (frames) => {
    // Use the last captured frame blob for submission
    setFaceBlob(frames[frames.length - 1])
  }

  const submitFace = async () => {
    if (!faceBlob || !username.trim()) return
    setLoading(true); setError('')
    try {
      const res = await loginFace(username.trim(), faceBlob)
      setSessionToken(res.session_token)
      setFaceConf(res.face_confidence)
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.detail || 'Face verification failed')
    } finally { setLoading(false) }
  }

  /* ── Step 2: Voice ── */
  const submitVoice = async () => {
    if (!voiceBlob || !sessionToken) return
    setLoading(true); setError('')
    try {
      const res = await loginVoice(sessionToken, voiceBlob)
      setVoiceConf(res.voice_confidence)
      login(res.access_token, {
        username: res.username,
        user_id: res.user_id,
        face_confidence: res.face_confidence,
        voice_confidence: res.voice_confidence,
        expires_in: res.expires_in,
        issued_at: Date.now(),
      })
      setStep(3)
      setTimeout(() => navigate('/dashboard'), 1400)
    } catch (err) {
      setError(err.response?.data?.detail || 'Voice verification failed')
    } finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }} className="grid-bg">
      <div style={{ position: 'fixed', top: '-20%', right: '-10%', width: 500, height: 500, background: 'radial-gradient(ellipse, rgba(0,200,160,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 480 }}>
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>BIO<span style={{ color: 'var(--accent)' }}>AUTH</span></div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Biometric login — two-factor verification</p>
        </motion.div>

        <StepIndicator currentStep={step} />

        <motion.div key={step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} style={card}>

          {/* STEP 1 – Face */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Face Verification</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Enter your username, then scan your face</p>
              </div>

              {/* Username input */}
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Username</label>
                <input
                  value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  autoComplete="username"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', color: 'var(--text-primary)', fontSize: 14, outline: 'none', transition: 'border-color 0.2s', width: '100%' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--accent)' }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
                />
              </div>

              <FaceScanner captureCount={1} onCapture={handleFaceCapture} label="Look straight at the camera" />

              {error && (
                <div style={{ width: '100%', padding: '12px 16px', background: 'var(--error-bg)', border: '1px solid var(--error)', borderRadius: 'var(--radius-sm)', color: 'var(--error)', fontSize: 13 }}>
                  {error}
                </div>
              )}

              <motion.button whileTap={{ scale: 0.97 }}
                disabled={!faceBlob || !username.trim() || loading}
                onClick={submitFace}
                style={btnPrimary(!!faceBlob && !!username.trim() && !loading)}>
                {loading ? 'Verifying face…' : 'Verify Face →'}
              </motion.button>
            </div>
          )}

          {/* STEP 2 – Voice */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Voice Verification</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Face confirmed — now verify your voice</p>
              </div>

              {/* Face confidence result */}
              {faceConf !== null && (
                <div style={{ width: '100%' }}>
                  <ConfidenceBar label="Face Match" value={faceConf} threshold={0.40} />
                </div>
              )}

              {/* Passphrase prompt */}
              <div style={{ width: '100%', padding: '14px 18px', background: 'var(--accent-glow)', border: '1px solid var(--border-accent)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Say Your Passphrase</div>
                <div style={{ fontSize: 15, fontStyle: 'italic', color: 'var(--text-primary)', fontWeight: 500 }}>"{PASSPHRASE}"</div>
              </div>

              <VoiceRecorder onCapture={blob => setVoiceBlob(blob)} minSeconds={3} maxSeconds={10} label="Speak clearly at a normal pace" />

              {error && (
                <div style={{ width: '100%', padding: '12px 16px', background: 'var(--error-bg)', border: '1px solid var(--error)', borderRadius: 'var(--radius-sm)', color: 'var(--error)', fontSize: 13 }}>
                  {error}
                </div>
              )}

              <motion.button whileTap={{ scale: 0.97 }}
                disabled={!voiceBlob || loading}
                onClick={submitVoice}
                style={btnPrimary(!!voiceBlob && !loading)}>
                {loading ? 'Verifying voice…' : 'Complete Login →'}
              </motion.button>
            </div>
          )}

          {/* STEP 3 – Authenticated */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#0d0d0f', boxShadow: '0 0 48px rgba(0,200,160,0.6)' }}>
                ✓
              </motion.div>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>Identity Confirmed</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Redirecting to dashboard…</p>
              </div>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {faceConf !== null && <ConfidenceBar label="Face Match" value={faceConf} threshold={0.40} />}
                {voiceConf !== null && <ConfidenceBar label="Voice Match" value={voiceConf} threshold={0.70} />}
              </div>
            </div>
          )}
        </motion.div>

        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
          No account? <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 600 }}>Register here</Link>
        </p>
      </div>
    </div>
  )
}
