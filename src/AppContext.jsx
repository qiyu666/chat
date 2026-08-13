import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AppContext = createContext()

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  const [hasPaymentPassword, setHasPaymentPassword] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (stored) {
      try {
        const u = JSON.parse(stored)
        setUser(u)
        setHasPaymentPassword(!!u.hasPaymentPassword)
        if (u._token) localStorage.setItem('token', u._token)
      } catch (e) {
        localStorage.removeItem('user')
      }
    }
  }, [])

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2500)
  }, [])

  const login = async (username, password) => {
    setLoading(true)
    try {
      const data = await import('./api').then(m => m.default).then(api => api.auth.login(username, password))
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)
      setHasPaymentPassword(!!data.user?.hasPaymentPassword)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      setLoading(false)
    }
  }

  const register = async (username, password) => {
    setLoading(true)
    try {
      const data = await import('./api').then(m => m.default).then(api => api.auth.register(username, password))
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)
      setHasPaymentPassword(!!data.user?.hasPaymentPassword)
      return { success: true }
    } catch (e) {
      return { success: false, error: e.message }
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    import('./api').then(m => m.default).then(api => api.auth.logout())
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('hasPaymentPassword')
    setUser(null)
    setHasPaymentPassword(false)
  }

  const refreshUser = async () => {
    try {
      const stored = localStorage.getItem('user')
      if (stored) {
        const u = JSON.parse(stored)
        setUser(u)
        if (u._token) localStorage.setItem('token', u._token)
        setHasPaymentPassword(!!u.hasPaymentPassword)
      }
    } catch (e) {}
  }

  const updatePaymentPasswordStatus = (hasPassword) => {
    localStorage.setItem('hasPaymentPassword', hasPassword ? 'true' : 'false')
    setHasPaymentPassword(hasPassword)
    const stored = JSON.parse(localStorage.getItem('user') || '{}')
    stored.hasPaymentPassword = hasPassword
    localStorage.setItem('user', JSON.stringify(stored))
    setUser(stored)
  }

  return (
    <AppContext.Provider value={{ user, loading, toast, hasPaymentPassword, login, register, logout, refreshUser, updatePaymentPasswordStatus }}>
      {children}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          background: toast.type === 'error' ? '#e94560' : '#4ade80',
          color: '#fff',
          padding: '10px 20px',
          borderRadius: 8,
          fontSize: 14,
          zIndex: 9999,
          maxWidth: '80%',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}>
          {toast.message}
        </div>
      )}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
