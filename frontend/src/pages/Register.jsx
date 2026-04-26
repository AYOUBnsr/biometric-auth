import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import FaceScanner from '../components/FaceScanner'
import VoiceRecorder from '../components/VoiceRecorder'
import { registerUser } from '../api'

const PASSPHRASE = 'My voice is my secure password'

function InputField({ label, type = 'text', value, onChange, placeholder, autoComplete }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>
        {label}
      </label>
      <input
        type={type} value={value} onChange={onChange}
        placeholder={placeholder} autoComplete={autoComplete}
        style={{
          background: 'var(--bg-input)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)', padding: '12px 14px',
          color: 'var(--text-primary)', fontSize: 14, outline: 'none',
          transition: 'border-color 0.2s', width: '100%',
        }}
        onFocus={e => { e.target.style.borderColor = 'var(--accent)' }}
        onBlur={e => { e.target.style.borderColor = 'var(--border)' }}
      />
    </div>
  )
}

const STEPS = ['Account', 'Face', 'Voice', 'Done']

export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [faceFrames, setFaceFrames] = useState(null)
  const [voiceBlob, setVoiceBlob] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const handleSubmit = async () => {
    if (!faceFrames || !voiceBlob) return
    setLoading(true); setError('')
    try {
      const res = await registerUser(form.username, form.email, form.password, faceFrames, voiceBlob)
      setResult(res); setStep(3)
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.')
    } finally { setLoading(false) }
  }

  const ok0 = form.username.length >= 3 && form.email.includes('@') && form.password.length >= 8
  const ok1 = !!faceFrames
  const ok2 = !!voiceBlob

  const card = {
    background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)', padding: 32,
    backdropFilter: 'blur(12px)', boxShadow: 'var(--shadow-card)',
  }
  const btnPrimary = (enabled) => ({
    padding: '12px', borderRadius: 'var(--radius-sm)',
    background: enabled ? 'var(--accent)' : 'var(--bg-card-hover)',
    color: enabled ? '#0d0d0f' : 'var(--text-muted)',
    border: 'none', fontWeight: 700, fontSize: 14,
    cursor: enabled ? 'pointer' : 'not-allowed', width: '100%',
  })
  const btnSecondary = {
    padding: '12px', borderRadius: 'var(--radius-sm)',
    background: 'var(--bg-card-hover)', border: '1px solid var(--border)',
    color: 'var(--text-secondary)', fontWeight: 600, fontSize: 14,
    cursor: 'pointer', flex: 1,
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }} className="grid-bg">
      <div style={{ position: 'fixed', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(0,200,160,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ width: '100%', maxWidth: 520 }}>
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em' }}>BIO<span style={{ color: 'var(--accent)' }}>AUTH</span></div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Create your biometric identity</p>
        </motion.div>

        {/* Step tabs */}
        <div style={{ display: 'flex', marginBottom: 24, background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: 4 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{
              flex: 1, textAlign: 'center', padding: '8px 4px',
              borderRadius: 'var(--radius-sm)',
              background: i === step ? 'var(--accent-glow)' : 'transparent',
              color: i === step ? 'var(--accent)' : i < step ? 'var(--text-secondary)' : 'var(--text-muted)',
              fontSize: 12, fontWeight: 600, letterSpacing: '0.04em',
              borderBottom: i === step ? '2px solid var(--accent)' : '2px solid transparent',
              transition: 'all 0.2s',
            }}>
              {i < step ? '✓ ' : ''}{s}
            </div>
          ))}
        </div>

        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} style={card}>

          {/* STEP 0 – Account */}
          {step === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Create Account</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Set up your login credentials</p>
              </div>
              <InputField label="Username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="ayoub" autoComplete="username" />
              <InputField label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@example.com" autoComplete="email" />
              <InputField label="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 8 characters" autoComplete="new-password" />
              <motion.button whileTap={{ scale: 0.97 }} disabled={!ok0} onClick={() => setStep(1)} style={btnPrimary(ok0)}>Continue →</motion.button>
            </div>
          )}

          {/* STEP 1 – Face */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Enroll Your Face</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>We'll capture 4 frames for your facial template</p>
              </div>
              <FaceScanner captureCount={4} onCapture={frames => setFaceFrames(frames)} label="Position your face in the circle and press Scan" />
              <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                <button onClick={() => setStep(0)} style={btnSecondary}>← Back</button>
                <motion.button whileTap={{ scale: 0.97 }} disabled={!ok1} onClick={() => setStep(2)} style={{ ...btnPrimary(ok1), flex: 2 }}>Continue →</motion.button>
              </div>
            </div>
          )}

          {/* STEP 2 – Voice */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Enroll Your Voice</h2>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Speak the passphrase below</p>
              </div>
              <div style={{ width: '100%', padding: '16px 20px', background: 'var(--accent-glow)', border: '1px solid var(--border-accent)', borderRadius: 'var(--radius)', textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Your Passphrase</div>
                <div style={{ fontSize: 16, fontStyle: 'italic', color: 'var(--text-primary)', fontWeight: 500 }}>"{PASSPHRASE}"</div>
              </div>
              <VoiceRecorder onCapture={blob => setVoiceBlob(blob)} minSeconds={4} maxSeconds={10} label="Speak clearly at a normal pace" />
              {error && (
                <div style={{ width: '100%', padding: '12px 16px', background: 'var(--error-bg)', border: '1px solid var(--error)', borderRadius: 'var(--radius-sm)', color: 'var(--error)', fontSize: 13 }}>
                  {error}
                </div>
              )}
              <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                <button onClick={() => setStep(1)} style={btnSecondary}>← Back</button>
                <motion.button whileTap={{ scale: 0.97 }} disabled={!ok2 || loading} onClick={handleSubmit} style={{ ...btnPrimary(ok2 && !loading), flex: 2 }}>
                  {loading ? 'Registering…' : 'Complete Registration'}
                </motion.button>
              </div>
            </div>
          )}

          {/* STEP 3 – Done */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, textAlign: 'center' }}>
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: '#0d0d0f', boxShadow: '0 0 40px rgba(0,200,160,0.5)' }}>
                ✓
              </motion.div>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>You're enrolled!</h2>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  Welcome, <strong style={{ color: 'var(--accent)' }}>{result?.username}</strong>.<br />
                  Your biometric identity has been securely stored.
                </p>
              </div>
              <div style={{ width: '100%', padding: '16px', background: 'var(--bg-input)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                {[['Face Enrolled', '✓'], ['Voice Enrolled', '✓'], ['User ID', result?.user_id?.slice(0,18) + '…']].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 8 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                    <span style={{ color: 'var(--accent)', fontFamily: k === 'User ID' ? 'var(--font-mono)' : 'inherit', fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
              <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate('/login')} style={{ ...btnPrimary(true), width: '100%' }}>Go to Login</motion.button>
            </div>
          )}
        </motion.div>

        {step < 3 && (
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-muted)' }}>
            Already registered? <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 600 }}>Sign in</Link>
          </p>
        )}
      </div>
    </div>
  )
}
