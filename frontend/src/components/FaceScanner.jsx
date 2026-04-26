import React, { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function FaceScanner({ onCapture, captureCount = 4, isActive = true, label = 'Look straight at the camera' }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const [status, setStatus] = useState('idle') // idle | streaming | capturing | done | error
  const [capturedFrames, setCapturedFrames] = useState([])
  const [captureProgress, setCaptureProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [scanning, setScanning] = useState(false)

  // Start webcam
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: 'user' },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStatus('streaming')
      setErrorMsg('')
    } catch (err) {
      setErrorMsg('Camera access denied. Please allow webcam access.')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (isActive) startCamera()
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop())
      }
    }
  }, [isActive, startCamera])

  // Capture frames with delay between them
  const captureFrames = useCallback(async () => {
    if (status !== 'streaming' || !videoRef.current || !canvasRef.current) return

    setStatus('capturing')
    setScanning(true)
    const frames = []
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')

    for (let i = 0; i < captureCount; i++) {
      await new Promise((r) => setTimeout(r, 400))
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      ctx.drawImage(videoRef.current, 0, 0)
      const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.9))
      frames.push(blob)
      setCaptureProgress(((i + 1) / captureCount) * 100)
    }

    setCapturedFrames(frames)
    setStatus('done')
    setScanning(false)

    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
    }

    onCapture?.(frames)
  }, [status, captureCount, onCapture])

  const reset = useCallback(() => {
    setCapturedFrames([])
    setCaptureProgress(0)
    setStatus('idle')
    setScanning(false)
    startCamera()
  }, [startCamera])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}>
      {/* Video container */}
      <div style={{ position: 'relative', width: 280, height: 280 }}>
        {/* Outer rings */}
        <motion.div
          animate={scanning ? { rotate: 360 } : {}}
          transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            inset: -16,
            borderRadius: '50%',
            border: '2px dashed rgba(0,200,160,0.3)',
            pointerEvents: 'none',
          }}
        />
        <motion.div
          animate={scanning ? { rotate: -360 } : {}}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          style={{
            position: 'absolute',
            inset: -28,
            borderRadius: '50%',
            border: '1px dashed rgba(0,200,160,0.15)',
            pointerEvents: 'none',
          }}
        />

        {/* Main video frame */}
        <div style={{
          width: 280,
          height: 280,
          borderRadius: '50%',
          overflow: 'hidden',
          border: `3px solid ${status === 'done' ? 'var(--accent)' : 'rgba(0,200,160,0.4)'}`,
          boxShadow: status === 'done'
            ? '0 0 40px rgba(0,200,160,0.4)'
            : scanning
              ? '0 0 24px rgba(0,200,160,0.25), inset 0 0 24px rgba(0,200,160,0.05)'
              : '0 0 0 rgba(0,0,0,0)',
          transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
          position: 'relative',
          background: 'var(--bg-card)',
        }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: 'scaleX(-1)', // mirror
              display: status === 'done' ? 'none' : 'block',
            }}
          />

          {/* Scan line animation */}
          {scanning && (
            <motion.div
              animate={{ y: ['0%', '300%'] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 0,
                height: '20%',
                background: 'linear-gradient(to bottom, transparent, rgba(0,200,160,0.15), transparent)',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* Done overlay */}
          {status === 'done' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,200,160,0.1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                style={{ fontSize: 48, color: 'var(--accent)' }}
              >
                ✓
              </motion.div>
              <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}>
                {captureCount} frames captured
              </span>
            </motion.div>
          )}

          {/* Error overlay */}
          {status === 'error' && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,77,109,0.1)',
            }}>
              <span style={{ fontSize: 32 }}>⚠</span>
            </div>
          )}
        </div>

        {/* Capture progress ring */}
        {status === 'capturing' && (
          <svg
            style={{ position: 'absolute', inset: -4, width: 288, height: 288, pointerEvents: 'none' }}
            viewBox="0 0 288 288"
          >
            <circle
              cx="144" cy="144" r="138"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 138}`}
              strokeDashoffset={`${2 * Math.PI * 138 * (1 - captureProgress / 100)}`}
              transform="rotate(-90 144 144)"
              style={{ transition: 'stroke-dashoffset 0.3s ease' }}
            />
          </svg>
        )}

        {/* Corner brackets */}
        {['tl', 'tr', 'bl', 'br'].map((pos) => (
          <div key={pos} style={{
            position: 'absolute',
            width: 20,
            height: 20,
            ...(pos.includes('t') ? { top: 8 } : { bottom: 8 }),
            ...(pos.includes('l') ? { left: 8 } : { right: 8 }),
            borderTop: pos.includes('t') ? '2px solid var(--accent)' : 'none',
            borderBottom: pos.includes('b') ? '2px solid var(--accent)' : 'none',
            borderLeft: pos.includes('l') ? '2px solid var(--accent)' : 'none',
            borderRight: pos.includes('r') ? '2px solid var(--accent)' : 'none',
            borderRadius: pos === 'tl' ? '4px 0 0 0' : pos === 'tr' ? '0 4px 0 0' : pos === 'bl' ? '0 0 0 4px' : '0 0 4px 0',
            opacity: 0.7,
          }} />
        ))}
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Status text */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 4 }}>{label}</p>
        {errorMsg && <p style={{ color: 'var(--error)', fontSize: 12 }}>{errorMsg}</p>}
        {status === 'capturing' && (
          <p style={{ color: 'var(--accent)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
            Capturing… {Math.round(captureProgress)}%
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 12 }}>
        {status === 'streaming' && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={captureFrames}
            style={{
              padding: '10px 28px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent)',
              color: '#0d0d0f',
              border: 'none',
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: '0.04em',
              cursor: 'pointer',
            }}
          >
            Scan Face
          </motion.button>
        )}
        {(status === 'done' || status === 'error') && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={reset}
            style={{
              padding: '10px 24px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--bg-card-hover)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
            }}
          >
            Retake
          </motion.button>
        )}
      </div>
    </div>
  )
}
