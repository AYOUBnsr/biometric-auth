import React, { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const BAR_COUNT = 48

export default function VoiceRecorder({ onCapture, minSeconds = 3, maxSeconds = 10, label = 'Speak your passphrase clearly' }) {
  const [status, setStatus] = useState('idle') // idle | recording | done | error
  const [elapsed, setElapsed] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [bars, setBars] = useState(new Array(BAR_COUNT).fill(2))
  const [audioUrl, setAudioUrl] = useState(null)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const analyserRef = useRef(null)
  const animFrameRef = useRef(null)
  const timerRef = useRef(null)
  const startTimeRef = useRef(null)

  const stopEverything = useCallback(() => {
    cancelAnimationFrame(animFrameRef.current)
    clearInterval(timerRef.current)
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    if (analyserRef.current) {
      const ctx = analyserRef.current.context
      if (ctx.state !== 'closed') ctx.close()
    }
  }, [])

  useEffect(() => () => stopEverything(), [stopEverything])

  // Animate bars from analyser data
  const animateBars = useCallback((analyser) => {
    const data = new Uint8Array(analyser.frequencyBinCount)
    const step = () => {
      analyser.getByteFrequencyData(data)
      const newBars = []
      const bucketSize = Math.floor(data.length / BAR_COUNT)
      for (let i = 0; i < BAR_COUNT; i++) {
        let sum = 0
        for (let j = 0; j < bucketSize; j++) sum += data[i * bucketSize + j]
        const avg = sum / bucketSize
        newBars.push(Math.max(2, (avg / 255) * 80))
      }
      setBars(newBars)
      animFrameRef.current = requestAnimationFrame(step)
    }
    step()
  }, [])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const audioCtx = new AudioContext()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser

      const mr = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
      mediaRecorderRef.current = mr
      chunksRef.current = []

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setStatus('done')
        setBars(new Array(BAR_COUNT).fill(2))
        onCapture?.(blob)
      }

      mr.start(100)
      startTimeRef.current = Date.now()
      setStatus('recording')
      setElapsed(0)
      setErrorMsg('')

      animateBars(analyser)

      timerRef.current = setInterval(() => {
        const secs = (Date.now() - startTimeRef.current) / 1000
        setElapsed(secs)
        if (secs >= maxSeconds) {
          stopRecording()
        }
      }, 100)

    } catch (err) {
      setErrorMsg('Microphone access denied. Please allow microphone access.')
      setStatus('error')
    }
  }, [animateBars, maxSeconds, onCapture])

  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current)
    cancelAnimationFrame(animFrameRef.current)
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
  }, [])

  const reset = useCallback(() => {
    stopEverything()
    setStatus('idle')
    setElapsed(0)
    setAudioUrl(null)
    setBars(new Array(BAR_COUNT).fill(2))
  }, [stopEverything])

  const canStop = elapsed >= minSeconds

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, width: '100%' }}>
      {/* Waveform visualizer */}
      <div style={{
        width: '100%',
        maxWidth: 360,
        height: 100,
        background: 'var(--bg-input)',
        borderRadius: 'var(--radius)',
        border: `1px solid ${status === 'recording' ? 'var(--border-accent)' : 'var(--border)'}`,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        overflow: 'hidden',
        position: 'relative',
        transition: 'border-color 0.3s',
        boxShadow: status === 'recording' ? '0 0 20px var(--accent-glow)' : 'none',
      }}>
        {bars.map((h, i) => (
          <motion.div
            key={i}
            animate={{ height: h }}
            transition={{ duration: 0.05, ease: 'linear' }}
            style={{
              width: `${100 / (BAR_COUNT * 1.5)}%`,
              minWidth: 2,
              background: status === 'recording'
                ? `hsl(${165 + (i / BAR_COUNT) * 20}, 100%, ${40 + (h / 80) * 25}%)`
                : 'var(--border)',
              borderRadius: 2,
              flexShrink: 0,
            }}
          />
        ))}

        {/* "REC" indicator */}
        {status === 'recording' && (
          <div style={{
            position: 'absolute', top: 8, right: 10,
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <motion.div
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff4d6d' }}
            />
            <span style={{ fontSize: 10, color: '#ff4d6d', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              REC {elapsed.toFixed(1)}s
            </span>
          </div>
        )}

        {/* Done label */}
        {status === 'done' && (
          <div style={{ position: 'absolute', top: 8, right: 10 }}>
            <span style={{ fontSize: 10, color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
              ✓ {elapsed.toFixed(1)}s recorded
            </span>
          </div>
        )}

        {/* Idle prompt */}
        {status === 'idle' && (
          <span style={{ position: 'absolute', fontSize: 12, color: 'var(--text-muted)' }}>
            Press record to begin
          </span>
        )}
      </div>

      {/* Progress bar */}
      {status === 'recording' && (
        <div style={{ width: '100%', maxWidth: 360, height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
          <motion.div
            style={{
              height: '100%',
              background: elapsed >= minSeconds ? 'var(--accent)' : 'var(--warning)',
              borderRadius: 2,
              width: `${Math.min(100, (elapsed / maxSeconds) * 100)}%`,
            }}
            transition={{ duration: 0.1 }}
          />
        </div>
      )}

      {/* Labels */}
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 4 }}>{label}</p>
        {status === 'recording' && !canStop && (
          <p style={{ color: 'var(--warning)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
            Keep speaking… ({minSeconds - Math.floor(elapsed)}s more needed)
          </p>
        )}
        {status === 'recording' && canStop && (
          <p style={{ color: 'var(--accent)', fontSize: 12 }}>You can stop now</p>
        )}
        {errorMsg && <p style={{ color: 'var(--error)', fontSize: 12 }}>{errorMsg}</p>}

        {/* Playback */}
        {status === 'done' && audioUrl && (
          <audio src={audioUrl} controls style={{ marginTop: 8, height: 28, opacity: 0.7 }} />
        )}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 12 }}>
        {status === 'idle' && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={startRecording}
            style={{
              padding: '10px 28px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--accent)',
              color: '#0d0d0f',
              border: 'none',
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: '0.04em',
            }}
          >
            ● Record
          </motion.button>
        )}
        {status === 'recording' && (
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={stopRecording}
            disabled={!canStop}
            style={{
              padding: '10px 28px',
              borderRadius: 'var(--radius-sm)',
              background: canStop ? '#ff4d6d' : 'var(--bg-card-hover)',
              color: canStop ? '#fff' : 'var(--text-muted)',
              border: 'none',
              fontWeight: 700,
              fontSize: 14,
              cursor: canStop ? 'pointer' : 'not-allowed',
            }}
          >
            ■ Stop
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
            }}
          >
            Re-record
          </motion.button>
        )}
      </div>
    </div>
  )
}
