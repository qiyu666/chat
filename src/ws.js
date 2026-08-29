const RECONNECT_DELAY = 3000
const BASE_URL = 'https://chat-api.aiit.cc.cd'

let ws = null
let chatId = null
let token = null
let reconnectTimer = null
let isDisposed = false

const callbacks = {
  onMessage: null,
  onConnected: null,
  onClosed: null,
  onError: null
}

function getWsUrl() {
  const protocol = BASE_URL.startsWith('https') ? 'wss' : 'ws'
  const host = BASE_URL.replace(/^https?:\/\//, '').replace(/\/.*$/, '')
  return `${protocol}://${host}/api/ws?token=${encodeURIComponent(token)}&chatId=${encodeURIComponent(chatId)}`
}

function send(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg))
  }
}

function connect(newChatId, newToken) {
  if (ws) {
    try { ws.close() } catch {}
    ws = null
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  chatId = newChatId
  token = newToken
  isDisposed = false
  doConnect()
}

function doConnect() {
  if (isDisposed) return
  try {
    ws = new WebSocket(getWsUrl())

    ws.onopen = () => {
      console.log('[WS] connected chatId=' + chatId)
      if (callbacks.onConnected) callbacks.onConnected()
    }

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data)
        console.log('[WS] msg type=' + data.type)
        if (data.type === 'connected') {
          if (callbacks.onConnected) callbacks.onConnected()
        } else if (data.type === 'new_message') {
          if (callbacks.onMessage) callbacks.onMessage(data)
        } else if (data.type === 'packet_claimed') {
          if (callbacks.onMessage) callbacks.onMessage(data)
        }
      } catch (e) {
        console.error('[WS] parse error:', e)
      }
    }

    ws.onclose = (evt) => {
      console.log('[WS] closed code=' + evt.code)
      ws = null
      if (callbacks.onClosed) callbacks.onClosed(evt.code, evt.reason)
      if (!isDisposed) scheduleReconnect()
    }

    ws.onerror = (evt) => {
      console.error('[WS] error:', evt)
      if (callbacks.onError) callbacks.onError(evt)
    }
  } catch (e) {
    console.error('[WS] connect error:', e)
    if (callbacks.onError) callbacks.onError(e)
    if (!isDisposed) scheduleReconnect()
  }
}

function scheduleReconnect() {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  reconnectTimer = setTimeout(() => {
    console.log('[WS] reconnecting...')
    doConnect()
  }, RECONNECT_DELAY)
}

function disconnect() {
  isDisposed = true
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
  if (ws) {
    try { ws.close() } catch {}
    ws = null
  }
  chatId = null
  token = null
}

function setOnMessage(fn) { callbacks.onMessage = fn }
function setOnConnected(fn) { callbacks.onConnected = fn }
function setOnClosed(fn) { callbacks.onClosed = fn }
function setOnError(fn) { callbacks.onError = fn }

export const ChatWebSocket = {
  connect,
  disconnect,
  send,
  setOnMessage,
  setOnConnected,
  setOnClosed,
  setOnError,
  get is_connected() { return ws !== null && ws.readyState === WebSocket.OPEN }
}
