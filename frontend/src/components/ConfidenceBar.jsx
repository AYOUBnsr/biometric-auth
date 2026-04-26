import React from 'react'
import { motion } from 'framer-motion'

export default function ConfidenceBar({ label, value, threshold = null }) {
  const pct = Math.round(value * 100 * 10) / 10
  const color = pct >= 80 ? 'var(--accent)' : pct >= 60 ? 'var(--warning)' : 'var(--error)'

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '0.04em' }}>
          {label}
        </span>
        <span style={{ fontSize: 13, color, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
          {pct.toFixed(1)}%
        </span>
      </div>
      <div style={{
        height: 6,
        background: 'var(--bg-input)',
        borderRadius: 3,
        overflow: 'hidden',
        position: 'relative',
      }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          style={{ height: '100%', background: color, borderRadius: 3 }}
        />
        {threshold && (
          <div style={{
            position: 'absolute', top: 0, bottom: 0,
            left: `${Math.round(threshold * 100)}%`,
            width: 2, background: 'rgba(255,255,255,0.3)', borderRadius: 1,
          }} />
        )}
      </div>
      {threshold && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 3 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            threshold {Math.round(threshold * 100)}%
          </span>
        </div>
      )}
    </div>
  )
}
