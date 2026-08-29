import { createContext, useContext, useRef, useEffect, useState } from 'react'
import { ChatWebSocket } from '../ws'
import { NotificationService } from '../utils/notifications'
import api from '../api'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const [activeChat, setActiveChat] = useState(null)
  const currentUserIdRef = useRef(null)
  const wsRef = useRef(null)
  const initializedRef = useRef(false)

  // 从 localStorage 获取当前用户 ID（与 ChatPage 相同的存储方式）
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        currentUserIdRef.current = JSON.parse(userStr)?.id
      }
    } catch (_) {}
  }, [])

  // 初始化通知权限（只执行一次）
  useEffect(() => {
    if (initializedRef.current || !currentUserIdRef.current) return
    initializedRef.current = true
    NotificationService.init()
  }, [currentUserIdRef])

  // 全局 WebSocket 监听（不依赖页面组件是否挂载）
  useEffect(() => {
    if (!currentUserIdRef.current) return

    const ws = new ChatWebSocket(currentUserIdRef.current)
    wsRef.current = ws

    ws.setOnMessage((data) => {
      if (!data || data.type !== 'message' || data.sender_id === currentUserIdRef.current) return
      if (data.chat_id === activeChat?.id) return
      const preview = (data.content || '').length > 30
        ? (data.content || '').slice(0, 30) + '...'
        : (data.content || '')
      NotificationService.showNotification(preview, data.sender_name || '新消息')
    })

    ws.connect()

    return () => {
      ws.close()
      wsRef.current = null
    }
  }, [activeChat])

  return (
    <NotificationContext.Provider value={{ activeChat, setActiveChat }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  return useContext(NotificationContext)
}
