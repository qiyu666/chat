import { useState, useEffect } from 'react'

export default function ErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false)
  const [error, setError] = useState(null)

  // 捕获脚本运行时错误（非渲染错误）
  useEffect(() => {
    const handleError = (event) => {
      event.preventDefault()
      setHasError(true)
      setError(event.error || new Error(event.message || 'Unknown error'))
    }
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', (e) => {
      setHasError(true)
      setError(e.reason || new Error('Promise 未处理异常'))
    })
    return () => {
      window.removeEventListener('error', handleError)
    }
  }, [])

  // 有错误时显示错误界面
  if (hasError) {
    return (
      <div style={{
        minHeight: '100vh', minHeight: '100dvh',
        background: '#0f0f1a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, color: '#fff'
      }}>
        <div style={{ textAlign: 'center', maxWidth: '100%' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h2 style={{ marginBottom: 12 }}>页面出错了</h2>
          <pre style={{
            background: '#1a1a2e', padding: 12, borderRadius: 8,
            color: '#e94560', fontSize: 12, maxWidth: 300,
            overflow: 'auto', whiteSpace: 'pre-wrap', marginBottom: 16,
            textAlign: 'left'
          }}>
            {error?.message || '未知错误'}
          </pre>
          <button
            onClick={() => { setHasError(false); setError(null); window.location.reload() }}
            style={{
              padding: '10px 24px', background: '#e94560', color: '#fff',
              borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14
            }}
          >
            刷新页面
          </button>
        </div>
      </div>
    )
  }

  return children
}
