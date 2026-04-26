import React from 'react'
import { motion } from 'framer-motion'

const steps = [
  { id: 1, label: 'Face Scan', icon: '◉' },
  { id: 2, label: 'Voice Check', icon: '◎' },
  { id: 3, label: 'Authenticated', icon: '✦' },
]

export default function StepIndicator({ currentStep }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 0,
      padding: '0 0 32px',
      width: '100%',
    }}>
      {steps.map((step, idx) => {
        const isDone = currentStep > step.id
        const isActive = currentStep === step.id

        return (
          <React.Fragment key={step.id}>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.1 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}
            >
              {/* Dot */}
              <div style={{
                position: 'relative',
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: isDone
                  ? 'var(--accent)'
                  : isActive
                    ? 'var(--accent-glow)'
                    : 'var(--bg-card)',
                border: `2px solid ${isDone || isActive ? 'var(--accent)' : 'var(--border)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: isDone ? 16 : 18,
                color: isDone ? '#0d0d0f' : isActive ? 'var(--accent)' : 'var(--text-muted)',
                transition: 'all 0.3s ease',
                boxShadow: isActive ? '0 0 20px var(--accent-glow-strong)' : 'none',
              }}>
                {isDone ? '✓' : step.icon}

                {/* Pulsing ring for active */}
                {isActive && (
                  <motion.div
                    animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{
                      position: 'absolute',
                      inset: -4,
                      borderRadius: '50%',
                      border: '2px solid var(--accent)',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </div>

              {/* Label */}
              <span style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: isDone || isActive ? 'var(--accent)' : 'var(--text-muted)',
                transition: 'color 0.3s',
                whiteSpace: 'nowrap',
              }}>
                {step.label}
              </span>
            </motion.div>

            {/* Connector line */}
            {idx < steps.length - 1 && (
              <div style={{
                width: 60,
                height: 2,
                marginBottom: 24,
                background: currentStep > step.id
                  ? 'var(--accent)'
                  : 'var(--border)',
                transition: 'background 0.4s ease',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {currentStep > step.id && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.4 }}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'var(--accent)',
                      transformOrigin: 'left',
                    }}
                  />
                )}
              </div>
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}
