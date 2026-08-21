import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, ArrowLeft, Phone, Video, Smile, ImagePlus, Lock, Eye, EyeOff } from 'lucide-react'
import api from '../api'
import { uploadToImgbb } from '../utils/imgbb'
import { useApp } from '../AppContext'

export default function ChatPage({ contact, chatId: initialChatId, onBack }) {
  const { hasPaymentPassword } = useApp()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [unreadFromOther, setUnreadFromOther] = useState(0)
  const [showSendPacket, setShowSendPacket] = useState(false)
  const [packetAmount, setPacketAmount] = useState('')
  const [packetMsg, setPacketMsg] = useState('')
  const [packetPwd, setPacketPwd] = useState('')
  const [showPacketPwd, setShowPacketPwd] = useState(false)
  const [sendingPacket, setSendingPacket] = useState(false)
  const [sendingImage, setSendingImage] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [packetPwdError, setPacketPwdError] = useState('')
  const fileInputRef = useRef(null)

  const handleCloseResult = () => {
    setViewingPacketId(null)
    setClaimedResult(null)
    setPacketOpenAnim(false)
    setPacketOpenData(null)
  }

  // 打开红包流程状态
  const [viewingPacketId, setViewingPacketId] = useState(null)
  const [isClaiming, setIsClaiming] = useState(false)   // 正在点击开/动画中
  const [claimedResult, setClaimedResult] = useState(null)
  const [packetOpenAnim, setPacketOpenAnim] = useState(false)
  const [packetOpenData, setPacketOpenData] = useState(null) // 缓存开红包时的消息数据，防止re-render丢失

  const bottomRef = useRef(null)
  const isAtBottomRef = useRef(true)
  const lastMsgCountRef = useRef(0)
  const justSentRef = useRef(false)

  const effectiveChatId = initialChatId || contact?.chatId

  const loadMessages = useCallback(async () => {
    if (!effectiveChatId) return
    setLoading(true)
    try {
      const data = await api.messages.get(effectiveChatId)
      const newMsgs = data.messages || []
      const prevCount = lastMsgCountRef.current
      lastMsgCountRef.current = newMsgs.length
      if (newMsgs.length > prevCount) {
        const newMsg = newMsgs[newMsgs.length - 1]
        const currentUser = localStorage.getItem('user')
          ? JSON.parse(localStorage.getItem('user')).id
          : null
        if (newMsg.sender_id !== currentUser) {
          setUnreadFromOther(c => c + 1)
        }
      }
      setMessages(newMsgs)
    } catch (e) {
      console.error('loadMessages error:', e)
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [effectiveChatId, contact?.id])

  useEffect(() => {
    loadMessages()
    lastMsgCountRef.current = 0
  }, [loadMessages])

  useEffect(() => {
    if (!effectiveChatId) return
    justSentRef.current = false
    const interval = setInterval(() => {
      if (!justSentRef.current) {
        loadMessages()
      }
      justSentRef.current = false
    }, 1500)
    return () => clearInterval(interval)
  }, [effectiveChatId, loadMessages])

  const handleMessageScroll = useCallback(() => {
    const el = document.querySelector('[data-chat-messages]')
    if (!el) return
    const threshold = 80
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
  }, [])

  useEffect(() => {
    const el = document.querySelector('[data-chat-messages]')
    if (!el) return
    el.addEventListener('scroll', handleMessageScroll)
    return () => el.removeEventListener('scroll', handleMessageScroll)
  }, [handleMessageScroll])

  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return
    const content = input.trim()
    let chatId = effectiveChatId
    if (!chatId) {
      const friendId = contact?.id
      if (!friendId) return
      const r = await api.request('POST', '/chats', { friendId })
      chatId = r.chatId
    }
    setInput('')
    try {
      await api.messages.send(chatId, content)
      justSentRef.current = true
      const currentUser = localStorage.getItem('user')
        ? JSON.parse(localStorage.getItem('user'))
        : null
      setMessages(prev => {
        const msg = {
          id: 'temp_' + Date.now(),
          sender_id: currentUser?.id,
          senderUsername: currentUser?.username,
          content,
          created_at: new Date().toISOString()
        }
        lastMsgCountRef.current = prev.length + 1
        return [...prev, msg]
      })
    } catch (e) {
      console.error('send error:', e)
      setInput(content)
    }
  }

  const handleSendPacket = async () => {
    if (!packetAmount.trim()) return
    let chatId = effectiveChatId
    if (!chatId) {
      const friendId = contact?.id
      if (!friendId) return
      const r = await api.request('POST', '/chats', { friendId })
      chatId = r.chatId
    }
    const amount = parseFloat(packetAmount)
    if (!amount || amount <= 0) return
    if (!packetPwd || !/^\d{6}$/.test(packetPwd)) {
      setPacketPwdError('请输入6位支付密码')
      return
    }
    setPacketPwdError('')
    setSendingPacket(true)
    try {
      await api.wallet.sendRedPacket({ amount, chatId, message: packetMsg, password: packetPwd })
      setShowSendPacket(false)
      setPacketAmount('')
      setPacketMsg('')
      setPacketPwd('')
      setShowPacketPwd(false)
      setPacketPwdError('')
      await loadMessages()
    } catch (e) {
      setPacketPwdError(e.message || '发送失败')
    } finally {
      setSendingPacket(false)
    }
  }

  const handleSelectImage = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    let chatId = effectiveChatId
    if (!chatId) {
      const friendId = contact?.id
      if (!friendId) return
      const r = await api.request('POST', '/chats', { friendId })
      chatId = r.chatId
    }
    setSendingImage(true)
    try {
      const url = await uploadToImgbb(file)
      await api.messages.send(chatId, url)
      justSentRef.current = true
      const currentUser = localStorage.getItem('user')
        ? JSON.parse(localStorage.getItem('user'))
        : null
      setMessages(prev => {
        lastMsgCountRef.current = prev.length + 1
        return [...prev, {
          id: 'temp_' + Date.now(),
          sender_id: currentUser?.id,
          senderUsername: currentUser?.username,
          content: url,
          created_at: new Date().toISOString()
        }]
      })
    } catch (e) {
      alert(e.message || '图片发送失败')
    } finally {
      setSendingImage(false)
    }
  }

  const isImageUrl = (text) => /\.(jpg|jpeg|png|webp|gif|bmp)/i.test(text) && (text.startsWith('http') || text.startsWith('data:image'))

  // 点击红包气泡 → 打开全屏开红包界面
  const handleOpenPacket = (msg) => {
    const packetId = msg.redPacketId
    if (!packetId || msg.claimed) return
    setViewingPacketId(packetId)
    setPacketOpenAnim(false)
    setPacketOpenData(msg)
  }

  // 点击「開」按钮 → 执行领取，立即显示结果
  const handleTapOpen = async () => {
    const msg = messages.find(m => m.redPacketId === viewingPacketId) || packetOpenData
    if (!msg) { setViewingPacketId(null); return }
    try {
      const res = await api.wallet.claimRedPacket(viewingPacketId)
      const claimed = res.amount ?? parseFloat(msg.content.match(/¥([\d.]+)/)?.[1]) ?? 0
      setClaimedResult({ amount: claimed, senderUsername: msg.senderUsername, blessing: msg.content.includes('：') ? msg.content.split('：')[1] : '' })
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, claimed: true } : m))
      await loadMessages()
    } catch (e) {
      alert(e.message || '领取失败')
      setIsClaiming(false)
    }
    // 不关闭 Overlay，等用户主动关闭
  }

  const stored = localStorage.getItem('user')
  const currentUser = stored ? JSON.parse(stored) : null
  const isSelf = (senderId) => senderId === currentUser?.id

  // ── 解析红包消息 ──────────────────────────────────
  const parsePacketMsg = (msg) => {
    const m = /¥([\d.]+)/.exec(msg.content)
    const amount = m ? parseFloat(m[1]) : 0
    const hasMsg = msg.content.includes('：')
    const blessing = hasMsg ? msg.content.split('：')[1] : ''
    return { amount, blessing }
  }

  // ── 红包气泡（聊天列表内）─────────────────────────
  const renderPacketBubble = (msg) => {
    const self = isSelf(msg.sender_id)
    const { amount, blessing } = parsePacketMsg(msg)
    const canOpen = !self && !msg.claimed
    const isClaimed = msg.claimed

    return (
      <div key={msg.id} style={{ marginBottom: 12, display: 'flex', justifyContent: self ? 'flex-end' : 'flex-start' }}>
        {!self && <div style={styles.msgAvatarLeft}>{msg.senderUsername?.[0]?.toUpperCase() || '?'}</div>}
        <div style={{ cursor: canOpen ? 'pointer' : 'default' }} onClick={canOpen ? () => handleOpenPacket(msg) : undefined}>
          <div style={{
            ...styles.packetBubble,
            ...(isClaimed ? styles.packetBubbleClaimed : {}),
            ...(canOpen ? styles.packetBubbleClickable : {})
          }}>
            <div style={styles.packetBubbleInner}>
              <div style={styles.packetIconWrap}>
                <div style={styles.packetIcon}>
                  <span style={{ fontSize: 16 }}>{isClaimed ? '🧧' : '🧧'}</span>
                  <span style={styles.packetIconYuan}>¥</span>
                </div>
              </div>
              <div style={styles.packetBubbleRight}>
                <div style={styles.packetBubbleText}>
                  {isClaimed ? '已领取' : (blessing || '微信红包')}
                </div>
                <div style={styles.packetBubbleSub}>{isClaimed ? '' : '微信红包'}</div>
              </div>
            </div>
          </div>
        </div>
        {self && <div style={{ ...styles.msgAvatarRight, background: '#e94560' }}>{contact.username?.[0]?.toUpperCase()}</div>}
      </div>
    )
  }

  // ── 全屏开红包界面 ────────────────────────────────
  const renderOpenPacket = () => {
    if (!viewingPacketId) return null
    // 优先用消息列表中的最新数据，如果找不到则用缓存数据（防止loadMessages后丢失）
    const msg = messages.find(m => m.redPacketId === viewingPacketId) || packetOpenData
    if (!msg) return null
    const { amount, blessing } = parsePacketMsg(msg)

    return (
      <div style={styles.openPacketOverlay}>
        {/* 红色背景 */}
        <div style={styles.openPacketBg} />
        {/* 内容 */}
        <div style={styles.openPacketContent}>
          <div style={styles.openPacketHeader}>
            <div style={styles.openPacketAvatar}>{msg.senderUsername?.[0]?.toUpperCase() || '?'}</div>
            <div>
              <div style={styles.openPacketSender}>{msg.senderUsername}的红包</div>
              {blessing && <div style={styles.openPacketBlessing}>{blessing}</div>}
            </div>
          </div>

          {claimedResult ? (
            // 已领取，显示结果（不渲染按钮）
            <div style={{ opacity: 0 }} />
          ) : (
            // 未领取，显示点击开按钮
            <button onClick={handleTapOpen} style={styles.tapOpenBtn}>
              <span style={styles.tapOpenText}>開</span>
            </button>
          )}
        </div>

        {/* 关闭按钮（仅在未领取时显示） */}
        {!claimedResult && (
          <button onClick={handleCloseResult} style={styles.closePacketBtn}>
            <span style={{ fontSize: 20 }}>✕</span>
          </button>
        )}

        {/* 领取结果页 */}
        {claimedResult && (
          <div style={styles.resultPage}>
            <div style={styles.resultPageTop} />
            <div style={styles.resultPageContent}>
              <div style={styles.resultAvatar}>{msg.senderUsername?.[0]?.toUpperCase() || '?'}</div>
              <div style={styles.resultSender}>{msg.senderUsername}的红包</div>
              <div style={styles.resultBlessing}>{blessing || ''}</div>
              <div style={styles.resultAmount}>{claimedResult.amount.toFixed(2)}<span style={styles.resultUnit}>元</span></div>
              <div style={styles.resultTip}>已存入零钱，可用于发红包 ›</div>
              <button style={styles.replyEmojiBtn} onClick={handleCloseResult}>
                <Smile size={18} color="#c9a84c" />
                <span style={styles.replyEmojiText}>回复表情到聊天</span>
              </button>
              <button style={styles.resultCloseBtn} onClick={handleCloseResult}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <circle cx="14" cy="14" r="13" stroke="#ff4d4f" strokeWidth="2"/>
                  <path d="M9 9l10 10M19 9L9 19" stroke="#ff4d4f" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={styles.container}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={(e) => {
        if (e.dataTransfer?.files?.length > 0) setDragOver(true)
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false)
      }}
      onDrop={async (e) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer?.files?.[0]
        if (!file || !file.type.startsWith('image/')) return
        let dragChatId = effectiveChatId
        if (!dragChatId) {
          const friendId = contact?.id
          if (!friendId) return
          const r = await api.request('POST', '/chats', { friendId })
          dragChatId = r.chatId
        }
        setSendingImage(true)
        let sentUrl = ''
        uploadToImgbb(file)
          .then(url => { sentUrl = url; return api.messages.send(dragChatId, url) })
          .then(() => {
            justSentRef.current = true
            const currentUser = localStorage.getItem('user')
              ? JSON.parse(localStorage.getItem('user'))
              : null
            setMessages(prev => {
              lastMsgCountRef.current = prev.length + 1
              return [...prev, {
                id: 'temp_' + Date.now(),
                sender_id: currentUser?.id,
                senderUsername: currentUser?.username,
                content: sentUrl,
                created_at: new Date().toISOString()
              }]
            })
          })
          .catch(err => alert(err.message || '图片发送失败'))
          .finally(() => setSendingImage(false))
      }}
    >
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backBtn}>
          <ArrowLeft size={22} />
        </button>
        <div style={styles.contactInfo}>
          <div style={styles.avatar}>{contact.username?.[0]?.toUpperCase()}</div>
          <span style={styles.contactName}>{contact.username}</span>
        </div>
        <div style={styles.headerActions}>
          <button style={styles.iconBtn} title="清除消息" onClick={async () => {
            if (!confirm('确定要清除与 ' + contact.username + ' 的所有消息吗？')) return
            try {
              await api.request('DELETE', `/chats/${effectiveChatId}/clear`)
              setMessages([])
            } catch (e) {
              alert(e.message || '清除失败')
            }
          }}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>
          <button style={styles.iconBtn}><Phone size={20} /></button>
          <button style={styles.iconBtn}><Video size={20} /></button>
        </div>
      </div>

      <div data-chat-messages style={styles.messages} onScroll={handleMessageScroll}>
        {loading && messages.length === 0 ? (
          <div style={styles.loading}>加载中...</div>
        ) : messages.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
            <p style={{ color: '#6c6c80' }}>开始对话吧</p>
          </div>
        ) : (
          messages.map((msg) => {
            const packetId = msg.redPacketId
            if (packetId) {
              return renderPacketBubble(msg)
            }
            // 兜底：以 🧧 开头即为红包消息
            if (msg.content.startsWith('🧧')) {
              const fallbackPacketId = 'fallback_' + msg.id.slice(0, 8)
              const fallbackMsg = { ...msg, redPacketId: fallbackPacketId }
              return renderPacketBubble(fallbackMsg)
            }
            const self = isSelf(msg.sender_id)
            const isImg = isImageUrl(msg.content)
            if (isImg) {
              return (
                <div key={msg.id} style={{ display: 'flex', justifyContent: self ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                  {!self && <div style={styles.msgAvatarLeft}>{msg.senderUsername?.[0]?.toUpperCase() || '?'}</div>}
                  <div style={self ? styles.imageWrapSelf : styles.imageWrapOther}>
                    <img src={msg.content} alt="" style={styles.imageMsg} loading="lazy" />
                  </div>
                  {self && <div style={{ ...styles.msgAvatarRight, background: '#e94560' }}>{contact.username?.[0]?.toUpperCase()}</div>}
                </div>
              )
            }
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: self ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
                {!self && <div style={styles.msgAvatarLeft}>{msg.senderUsername?.[0]?.toUpperCase() || '?'}</div>}
                <div style={{ ...styles.bubble, ...(self ? styles.bubbleSelf : styles.bubbleOther) }}>
                  {msg.content}
                </div>
                {self && <div style={{ ...styles.msgAvatarRight, background: '#e94560' }}>{contact.username?.[0]?.toUpperCase()}</div>}
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* 发红包弹窗 */}
      {showSendPacket && (
        <div style={styles.sendPacketOverlay} onClick={() => setShowSendPacket(false)}>
          <div style={styles.sendPacketCard} onClick={e => e.stopPropagation()}>
            <div style={styles.sendPacketBg} />
            <div style={styles.sendPacketInner}>
              <div style={styles.sendPacketTitle}>发红包</div>
              <div style={styles.sendPacketHint}>
                <span style={styles.yuanBig}>¥</span>
                <input
                  style={styles.amountInput}
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={packetAmount}
                  onChange={e => setPacketAmount(e.target.value)}
                  autoFocus
                />
              </div>
              <input
                style={styles.blessingInput}
                placeholder="祝福语（选填）"
                value={packetMsg}
                onChange={e => setPacketMsg(e.target.value)}
                maxLength={20}
              />
              <div style={styles.pwdWrap}>
                <span style={styles.pwdIcon}>🔒</span>
                <input
                  style={styles.pwdInput}
                  type={showPacketPwd ? 'text' : 'password'}
                  placeholder="支付密码（6位数字）"
                  maxLength={6}
                  value={packetPwd}
                  onChange={e => setPacketPwd(e.target.value.replace(/\D/g, ''))}
                />
                <button type="button" onClick={() => setShowPacketPwd(!showPacketPwd)} style={styles.eyeBtn}>
                  {showPacketPwd ? <EyeOff size={16} color="#6c6c80" /> : <Eye size={16} color="#6c6c80" />}
                </button>
              </div>
              {packetPwdError && <p style={{ color: '#e94560', fontSize: 13, margin: '6px 0 0 36px' }}>{packetPwdError}</p>}
              <div style={styles.sendPacketFooter}>
                <span style={styles.packetBalance}>
                  余额：¥{(parseFloat(currentUser?.balance) || 0).toFixed(2)}
                </span>
                <button
                  onClick={handleSendPacket}
                  disabled={sendingPacket || !packetAmount || parseFloat(packetAmount) <= 0}
                  style={{
                    ...styles.sendPacketBtn,
                    opacity: sendingPacket || !packetAmount || parseFloat(packetAmount) <= 0 ? 0.4 : 1
                  }}
                >
                  {sendingPacket ? '发送中...' : '发送'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 全屏开红包 + 领取结果 */}
      {renderOpenPacket()}

      {/* 拖拽上传覆盖层 */}
      {dragOver && (
        <div style={styles.dragOverlay}>
          <ImagePlus size={56} color="#ff6b81" />
          <span style={{ marginTop: 16, color: '#fff', fontSize: 18, fontWeight: 500 }}>松开以上传图片</span>
        </div>
      )}

      <div style={styles.inputBar}>
        {hasPaymentPassword ? (
          <button onClick={() => setShowSendPacket(true)} style={styles.packetBtn}>
            <span style={{ fontSize: 20 }}>🧧</span>
          </button>
        ) : (
          <button style={{ ...styles.packetBtn, opacity: 0.4, cursor: 'not-allowed' }} title="请先设置支付密码">
            <Lock size={18} color="rgba(255,255,255,0.6)" />
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleSelectImage}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          style={styles.imageBtn}
          disabled={sendingImage}
        >
          {sendingImage ? (
            <span style={{ fontSize: 18 }}>⏳</span>
          ) : (
            <ImagePlus size={22} color="#6c6c80" />
          )}
        </button>
        <button style={styles.smileBtn}>
          <Smile size={22} color="#6c6c80" />
        </button>
        <input
          style={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              handleSend()
            }
          }}
          placeholder="输入消息..."
        />
        <button
          onClick={handleSend}
          style={{ ...styles.sendBtn, opacity: input.trim() ? 1 : 0.4 }}
          disabled={!input.trim()}
        >
          <Send size={20} fill="currentColor" />
        </button>
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#0f0f1a',
    position: 'relative'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 16px',
    background: '#1a1a2e',
    borderBottom: '1px solid #2a2a4a',
    gap: 12
  },
  backBtn: { padding: 8, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#a0a0b8' },
  contactInfo: { display: 'flex', alignItems: 'center', flex: 1, gap: 10 },
  avatar: {
    width: 36, height: 36, borderRadius: '50%',
    background: '#e94560',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 600, fontSize: 16
  },
  contactName: { fontSize: 16, fontWeight: 600, color: '#fff' },
  headerActions: { display: 'flex', gap: 4 },
  iconBtn: { padding: 8, borderRadius: 8, background: 'none', border: 'none', color: '#a0a0b8', cursor: 'pointer' },
  messages: { flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column' },
  messagesDragOver: { outline: '2px dashed #e94560', outlineOffset: '-8px', borderRadius: 8, background: 'rgba(233,69,96,0.05)' },
  dragOverlay: {
    position: 'fixed', inset: 0, zIndex: 50,
    background: 'rgba(15,15,26,0.88)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(6px)'
  },
  loading: { textAlign: 'center', color: '#6c6c80', padding: 40 },
  empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6c6c80' },
  msgAvatarLeft: {
    width: 36, height: 36, borderRadius: '50%',
    background: '#2a2a4a', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 600, marginRight: 8, flexShrink: 0, alignSelf: 'flex-end',
    color: '#a0a0b8'
  },
  msgAvatarRight: {
    width: 36, height: 36, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 600, marginLeft: 8, flexShrink: 0, alignSelf: 'flex-end',
    color: '#fff'
  },
  bubble: { maxWidth: '75%', padding: '10px 14px', borderRadius: 16, fontSize: 15, lineHeight: 1.5, wordBreak: 'break-word', color: '#fff' },
  bubbleSelf: { background: '#e94560', borderBottomRightRadius: 4 },
  bubbleOther: { background: '#2a2a4a', borderBottomLeftRadius: 4 },

  // ── 聊天气泡红包卡片 ──────────────────────────────
  packetBubble: {
    width: 240,
    background: '#f5a623',
    borderRadius: 12,
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(245,166,35,0.4)'
  },
  packetBubbleClickable: { cursor: 'pointer' },
  packetBubbleClaimed: {
    opacity: 0.45,
    filter: 'grayscale(60%)',
  },
  packetBubbleInner: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 14px'
  },
  packetIconWrap: { flexShrink: 0 },
  packetIcon: {
    width: 44,
    height: 44,
    background: 'linear-gradient(160deg, #ff4d30, #d4380d)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    boxShadow: '0 2px 8px rgba(212,56,13,0.5)'
  },
  packetIconYuan: {
    position: 'absolute',
    bottom: 2,
    right: 3,
    fontSize: 10,
    color: '#ffd700',
    fontWeight: 800,
    background: '#ff6b35',
    borderRadius: '50%',
    width: 16,
    height: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  packetBubbleRight: { marginLeft: 12, flex: 1, overflow: 'hidden' },
  packetBubbleText: {
    fontSize: 15,
    fontWeight: 600,
    color: '#fff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  },
  packetBubbleSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4
  },

  // ── 全屏开红包界面 ────────────────────────────────
  openPacketOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column'
  },
  openPacketBg: {
    position: 'absolute',
    inset: 0,
    background: 'linear-gradient(180deg, #ff5722 0%, #d84315 60%, #bf360c 100%)',
    transition: 'all 0.7s ease'
  },
  openPacketBgAnim: {
    opacity: 0,
    transform: 'scale(1.1)'
  },
  openPacketContent: {
    position: 'relative',
    zIndex: 2,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: '28vh',
    transition: 'all 0.7s ease'
  },
  openPacketContentAnim: {
    opacity: 0
  },
  openPacketHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    marginBottom: 40
  },
  openPacketAvatar: {
    width: 52,
    height: 52,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.25)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    fontWeight: 700,
    color: '#fff',
    border: '2px solid rgba(255,255,255,0.4)'
  },
  openPacketSender: { fontSize: 17, fontWeight: 600, color: 'rgba(255,255,255,0.95)' },
  openPacketBlessing: { fontSize: 14, color: 'rgba(255,215,0,0.9)', marginTop: 4, fontStyle: 'italic' },
  tapOpenBtn: {
    width: 90,
    height: 90,
    borderRadius: '50%',
    background: 'radial-gradient(circle, #ffe082 0%, #ffd54f 50%, #ffc107 100%)',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 30px rgba(255,193,7,0.6), inset 0 2px 0 rgba(255,255,255,0.5)',
    marginTop: 20
  },
  tapOpenText: {
    fontSize: 40,
    fontWeight: 900,
    color: '#bf360c',
    textShadow: '0 2px 4px rgba(0,0,0,0.2)'
  },
  closePacketBtn: {
    position: 'absolute',
    bottom: 40,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'transparent',
    border: '2px solid rgba(201,168,76,0.7)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#c9a84c',
    zIndex: 3
  },

  // ── 领取结果页 ────────────────────────────────────
  resultPage: {
    position: 'absolute',
    inset: 0,
    background: '#1a1a1a',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column'
  },
  resultPageTop: {
    height: 140,
    background: 'linear-gradient(180deg, #ff5722 0%, #d84315 100%)',
    borderRadius: '0 0 50% 50% / 0 0 100% 100%',
    flexShrink: 0,
    position: 'relative'
  },
  resultPageContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 60,
    gap: 8
  },
  resultAvatar: {
    width: 52,
    height: 52,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 20,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.8)',
    border: '2px solid rgba(201,168,76,0.5)'
  },
  resultSender: { fontSize: 16, color: 'rgba(255,255,255,0.85)', marginTop: 12, fontWeight: 500 },
  resultBlessing: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
  resultAmount: {
    fontSize: 64,
    fontWeight: 800,
    color: '#c9a84c',
    marginTop: 20,
    textShadow: '0 2px 20px rgba(201,168,76,0.4)'
  },
  resultUnit: { fontSize: 20, fontWeight: 500, color: '#c9a84c', marginLeft: 4 },
  resultTip: { fontSize: 13, color: 'rgba(201,168,76,0.7)', marginTop: 8 },
  replyEmojiBtn: {
    marginTop: 32,
    padding: '12px 28px',
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    cursor: 'pointer',
    color: '#c9a84c'
  },
  replyEmojiText: { fontSize: 15, fontWeight: 500 },
  resultCloseBtn: {
    marginTop: 16,
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },

  // ── 发红包弹窗 ────────────────────────────────────
  sendPacketOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.65)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 150
  },
  sendPacketCard: {
    width: '100%',
    maxWidth: 360,
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
    background: 'linear-gradient(180deg, #ff4d30 0%, #d4380d 60%, #a8280a 100%)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.6)'
  },
  sendPacketBg: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(circle at 50% 0%, rgba(255,200,100,0.3) 0%, transparent 60%)',
    pointerEvents: 'none'
  },
  sendPacketInner: {
    position: 'relative',
    padding: '28px 24px 24px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  },
  sendPacketTitle: {
    textAlign: 'center',
    fontSize: 17,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1
  },
  sendPacketHint: {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center'
  },
  yuanBig: {
    fontSize: 28,
    fontWeight: 700,
    color: 'rgba(255,215,0,0.9)',
    lineHeight: 1
  },
  amountInput: {
    fontSize: 42,
    fontWeight: 700,
    color: '#fff',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    width: 180,
    textAlign: 'center',
    padding: 0
  },
  blessingInput: {
    width: '100%',
    padding: '10px 14px',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    outline: 'none',
    boxSizing: 'border-box',
    border: '1px solid rgba(255,255,255,0.1)'
  },
  sendPacketFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4
  },
  packetBalance: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  sendPacketBtn: {
    padding: '10px 28px',
    background: '#ffd700',
    borderRadius: 20,
    color: '#a8280a',
    fontSize: 15,
    fontWeight: 700,
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
  },

  // ── 底部输入栏 ────────────────────────────────────
  inputBar: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 12px',
    background: '#1a1a2e',
    borderTop: '1px solid #2a2a4a',
    gap: 8
  },
  packetBtn: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #ff6b35, #e8361a)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(232,54,26,0.4)'
  },
  smileBtn: { padding: 8, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 },
  imageBtn: {
    padding: 8, borderRadius: 8, background: 'none', border: 'none',
    cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center'
  },
  imageMsg: {
    maxWidth: 220,
    borderRadius: 10,
    display: 'block',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
  },
  imageWrapSelf: {
    maxWidth: 260,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end'
  },
  imageWrapOther: {
    maxWidth: 260,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start'
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    background: '#16213e',
    borderRadius: 20,
    fontSize: 15,
    color: '#fff',
    outline: 'none',
    border: 'none'
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: '#e94560',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    flexShrink: 0,
    border: 'none',
    cursor: 'pointer'
  }
}
