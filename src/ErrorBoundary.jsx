import { useState, useEffect } from 'react'

export default function ErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const handleError = (event) => {
      event.preventDefault()
      setHasError(true)
      setError(event.error || new Error('Unknown error'))
    }
    window.addEventListener('error', handleError)
    return () => window.removeEventListener('error', handleError)
  }, [])

  // 捕获渲染错误
  if (hasError) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f0f1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ marginBottom: 8 }}>页面出错了</h2>
          <p style={{ color: '#6c6c80', fontSize: 14, marginBottom: 20 }}>{error?.message || '未知错误'}</p>
          <button
            onClick={() => { setHasError(false); setError(null); window.location.reload() }}
            style={{ padding: '10px 24px', background: '#e94560', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14 }}
          >
            刷新页面
          </button>
        </div>
      </div>
    )
  }

  return children
}
