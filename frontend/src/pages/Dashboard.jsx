import React, { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getMe, logout } from '../api'
import { useAuth } from '../App'
import ConfidenceBar from '../components/ConfidenceBar'

function useCountdown(expiresInSeconds, issuedAt) {
  const [remaining, setRemaining] = useState(0)
  useEffect(() => {
    if (!expiresInSeconds || !issuedAt) return
    const expireAt = issuedAt + expiresInSeconds * 1000
    const tick = () => setRemaining(Math.max(0, Math.round((expireAt - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresInSeconds, issuedAt])
  return remaining
}

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function StatCard({ icon, label, value, sub, accent = false }) {
  return (
    <motion.div whileHover={{ y: -2 }} style={{
      background: 'var(--bg-card)', border: `1px solid ${accent ? 'var(--border-accent)' : 'var(--border)'}`,
      borderRadius: 'var(--radius)', padding: '20px',
      boxShadow: accent ? 'var(--shadow-glow)' : 'none',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ fontSize: 24 }}>{icon}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: accent ? 'var(--accent)' : 'var(--text-primary)', fontFamily: typeof value === 'string' && value.includes(':') ? 'var(--font-mono)' : 'inherit' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</div>}
    </motion.div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { tokenMeta, logoutLocal } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loggingOut, setLoggingOut] = useState(false)

  const remaining = useCountdown(tokenMeta?.expires_in, tokenMeta?.issued_at)
  const pctLeft = tokenMeta?.expires_in ? (remaining / tokenMeta.expires_in) * 100 : 100
  const expiryColor = pctLeft > 40 ? 'var(--accent)' : pctLeft > 15 ? 'var(--warning)' : 'var(--error)'

  useEffect(() => {
    getMe().then(setProfile).catch(() => {
      logoutLocal()
      navigate('/login')
    }).finally(() => setLoading(false))
  }, [])

  const handleLogout = async () => {
    setLoggingOut(true)
    try { await logout() } catch {}
    logoutLocal()
    navigate('/login')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent)' }} />
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', padding: '0', position: 'relative' }} className="grid-bg">
      {/* Ambient */}
      <div style={{ position: 'fixed', bottom: '-10%', left: '-10%', width: 500, height: 500, background: 'radial-gradient(ellipse, rgba(0,200,160,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Topbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(13,13,15,0.8)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border)',
        padding: '0 24px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' }}>
          BIO<span style={{ color: 'var(--accent)' }}>AUTH</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)' }} />
            Authenticated
          </div>
          <motion.button whileTap={{ scale: 0.96 }} onClick={handleLogout} disabled={loggingOut}
            style={{ padding: '7px 18px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            {loggingOut ? 'Signing out…' : 'Logout'}
          </motion.button>
        </div>
      </div>

      {/* Main */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>

        {/* Welcome header */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), #00a07e)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 700, color: '#0d0d0f',
              flexShrink: 0,
            }}>
              {(profile?.username?.[0] || '?').toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>
                Welcome back, <span style={{ color: 'var(--accent)' }}>{profile?.username}</span>
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                {profile?.email}
              </p>
            </div>
          </div>

          {/* Auth method badges */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            {[
              { icon: '◉', label: 'Face Verified', ok: true },
              { icon: '◎', label: 'Voice Verified', ok: true },
              { icon: '⚿', label: 'JWT Issued', ok: true },
            ].map(({ icon, label, ok }) => (
              <div key={label} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 12px', borderRadius: 20,
                background: 'var(--accent-glow)', border: '1px solid var(--border-accent)',
                fontSize: 12, color: 'var(--accent)', fontWeight: 600,
              }}>
                {icon} {label} {ok ? '✓' : '✗'}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Stats grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
          <StatCard icon="🕐" label="Session Expires" value={formatTime(remaining)} sub={`of ${formatTime(tokenMeta?.expires_in || 0)} total`} accent={pctLeft < 20} />
          <StatCard icon="📅" label="Member Since" value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
          <StatCard icon="🔐" label="Auth Method" value="2-Factor" sub="Face + Voice" accent />
          <StatCard icon="✦" label="Status" value="Active" sub="Biometrics enrolled" />
        </motion.div>

        {/* Token expiry bar */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Session Token</span>
            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: expiryColor, fontWeight: 600 }}>{formatTime(remaining)} remaining</span>
          </div>
          <div style={{ height: 8, background: 'var(--bg-input)', borderRadius: 4, overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${pctLeft}%` }}
              transition={{ duration: 1, ease: 'linear' }}
              style={{ height: '100%', background: expiryColor, borderRadius: 4, transition: 'background 0.5s' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Issued {new Date(tokenMeta?.issued_at || Date.now()).toLocaleTimeString()}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Expires {new Date((tokenMeta?.issued_at || Date.now()) + (tokenMeta?.expires_in || 0) * 1000).toLocaleTimeString()}</span>
          </div>
        </motion.div>

        {/* Biometric confidence scores */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 20 }}>
            Biometric Confidence Scores
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {tokenMeta?.face_confidence != null && (
              <ConfidenceBar label="Face Recognition" value={tokenMeta.face_confidence} threshold={0.40} />
            )}
            {tokenMeta?.voice_confidence != null && (
              <ConfidenceBar label="Voice Recognition" value={tokenMeta.voice_confidence} threshold={0.70} />
            )}
            {tokenMeta?.face_confidence == null && tokenMeta?.voice_confidence == null && (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
                Re-login to see confidence scores
              </p>
            )}
          </div>
        </motion.div>

        {/* Profile details */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '24px' }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 16 }}>
            Account Details
          </h3>
          {[
            ['User ID', profile?.user_id],
            ['Username', profile?.username],
            ['Email', profile?.email],
            ['Biometrics', profile?.biometric_registered ? 'Enrolled' : 'Not enrolled'],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{k}</span>
              <span style={{
                fontSize: 13, color: 'var(--text-secondary)',
                fontFamily: k === 'User ID' ? 'var(--font-mono)' : 'inherit',
                fontWeight: k !== 'User ID' ? 500 : 400,
                maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {v || '—'}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
