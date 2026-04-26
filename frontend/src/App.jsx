import React, { createContext, useContext, useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Register from './pages/Register'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

// ── Auth Context ──────────────────────────────────────────────────────────────

const AuthCtx = createContext(null)

export function useAuth() {
  return useContext(AuthCtx)
}

function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('access_token'))
  const [tokenMeta, setTokenMeta] = useState(() => {
    try { return JSON.parse(localStorage.getItem('token_meta') || 'null') } catch { return null }
  })

  const login = (accessToken, meta) => {
    localStorage.setItem('access_token', accessToken)
    localStorage.setItem('token_meta', JSON.stringify(meta))
    setToken(accessToken)
    setTokenMeta(meta)
  }

  const logoutLocal = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('token_meta')
    setToken(null)
    setTokenMeta(null)
  }

  return (
    <AuthCtx.Provider value={{ token, tokenMeta, login, logoutLocal, isAuthenticated: !!token }}>
      {children}
    </AuthCtx.Provider>
  )
}

// ── Protected route ───────────────────────────────────────────────────────────

function Protected({ children }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

// ── Page transition wrapper ───────────────────────────────────────────────────

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.2 } },
}

function PageWrapper({ children }) {
  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {children}
    </motion.div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <AuthProvider>
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/register" element={<PageWrapper><Register /></PageWrapper>} />
          <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
          <Route
            path="/dashboard"
            element={
              <Protected>
                <PageWrapper><Dashboard /></PageWrapper>
              </Protected>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AnimatePresence>
    </AuthProvider>
  )
}
