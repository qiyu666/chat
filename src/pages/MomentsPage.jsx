import { useState, useEffect, useRef } from 'react'
import { Camera, Heart, MessageCircle, Send, X } from 'lucide-react'
import api from '../api'
import { uploadToImgbb } from '../utils/imgbb'

export default function MomentsPage() {
  const [moments, setMoments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCompose, setShowCompose] = useState(false)
  const [content, setContent] = useState('')
  const [images, setImages] = useState([])
  const [posting, setPosting] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadMoments()
  }, [])

  const loadMoments = async () => {
    setLoading(true)
    try {
      const data = await api.moments.list()
      setMoments((data.moments || []).map(m => ({
        ...m,
        images: m.images ? JSON.parse(m.images) : []
      })))
    } catch (e) {
      setMoments([])
    } finally {
      setLoading(false)
    }
  }

  const handlePost = async () => {
    if (!content.trim() && images.length === 0) return
    setPosting(true)
    try {
      await api.moments.create(content.trim(), images)
      setContent('')
      setImages([])
      setShowCompose(false)
      try { await loadMoments() } catch (e) {}
    } catch (e) {
      alert(e.message || '发布失败，请重试')
    } finally {
      setPosting(false)
    }
  }

  const handleSelectMomentImage = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploadingImage(true)
    try {
      const url = await uploadToImgbb(file)
      setImages(prev => [...prev, url])
    } catch (e) {
      alert(e.message || '图片上传失败')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleDropMomentImage = async (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer?.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    setUploadingImage(true)
    try {
      const url = await uploadToImgbb(file)
      setImages(prev => [...prev, url])
    } catch (err) {
      alert(err.message || '图片上传失败')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleLike = async (momentId) => {
    try {
      await api.moments.like(momentId)
      await loadMoments()
    } catch (e) {}
  }

  const handleDelete = async (momentId) => {
    try {
      await api.moments.delete(momentId)
      await loadMoments()
    } catch (e) {}
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    const d = new Date(timeStr)
    const now = new Date()
    const diff = now - d
    if (diff < 60000) return '刚刚'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
    return d.toLocaleDateString('zh-CN')
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>朋友圈</h1>
        <button onClick={() => setShowCompose(true)} style={styles.composeBtn}>
          <Camera size={22} />
          <span style={styles.composeLabel}>发布</span>
        </button>
      </div>

      <div style={styles.feed}>
        {loading ? (
          <div style={styles.loading}>加载中...</div>
        ) : moments.length === 0 ? (
          <div style={styles.empty}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
            <p style={{ color: '#6c6c80' }}>还没有动态，点击右上发布第一条吧</p>
          </div>
        ) : (
          moments.map(moment => (
            <div key={moment.id} style={styles.moment}>
              <div style={styles.momentHeader}>
                <div style={styles.avatar}>{moment.userAvatar || moment.username?.[0]?.toUpperCase()}</div>
                <div>
                  <span style={styles.username}>{moment.username}</span>
                  <span style={styles.time}>{formatTime(moment.created_at || moment.createdAt)}</span>
                </div>
                {moment.isMy && (
                  <button onClick={() => handleDelete(moment.id)} style={styles.deleteBtn}>
                    <X size={16} />
                  </button>
                )}
              </div>

              {moment.content && (
                <p style={styles.content}>{moment.content}</p>
              )}

              {moment.images && moment.images.length > 0 && (
                <div style={styles.imageGrid}>
                  {moment.images.slice(0, 9).map((img, i) => (
                    <img key={i} src={img} alt="" style={{ ...styles.image, ...(moment.images.length === 1 ? styles.imageSingle : {}) }} />
                  ))}
                </div>
              )}

              <div style={styles.actions}>
                <button onClick={() => handleLike(moment.id)} style={styles.actionBtn}>
                  <Heart
                    size={16}
                    color={moment.liked ? '#e94560' : '#a0a0b8'}
                    fill={moment.liked ? '#e94560' : 'none'}
                  />
                  <span style={{ color: moment.liked ? '#e94560' : '#6c6c80', fontSize: 13 }}>
                    {moment.likes || 0}
                  </span>
                </button>
                <button style={styles.actionBtn}>
                  <MessageCircle size={16} color="#a0a0b8" />
                  <span style={{ color: '#6c6c80', fontSize: 13 }}>{moment.comments || 0}</span>
                </button>
                <button style={{ ...styles.actionBtn, marginLeft: 'auto' }}>
                  <Send size={16} color="#a0a0b8" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showCompose && (
        <div style={styles.modal} onClick={e => { if (e.target === e.currentTarget) setShowCompose(false) }}>
          <div
            style={{
              ...styles.modalContent,
              ...(dragOver ? styles.modalDragOver : {})
            }}
            onClick={e => e.stopPropagation()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(false) }}
            onDrop={handleDropMomentImage}
          >
            <div style={styles.modalHeader}>
              <span style={styles.modalTitle}>发布动态</span>
              <button onClick={() => setShowCompose(false)} style={styles.closeBtn}>✕</button>
            </div>
            <textarea
              style={styles.textarea}
              placeholder="分享此刻..."
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={4}
            />
            {images.length > 0 && (
              <div style={styles.imagePreview}>
                {images.map((img, i) => (
                  <div key={i} style={styles.previewImgWrap}>
                    <img src={img} alt="" style={styles.previewImg} />
                    <button onClick={() => setImages(images.filter((_, idx) => idx !== i))} style={styles.removeImg}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleSelectMomentImage}
            />
            <button
              style={{
                ...styles.addImgBtn,
                ...(uploadingImage ? styles.addImgBtnUploading : {})
              }}
              onClick={() => !uploadingImage && fileInputRef.current?.click()}
              disabled={uploadingImage}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation() }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                const file = e.dataTransfer?.files?.[0]
                if (!file || !file.type.startsWith('image/')) return
                setUploadingImage(true)
                uploadToImgbb(file)
                  .then(url => setImages(prev => [...prev, url]))
                  .catch(err => alert(err.message || '图片上传失败'))
                  .finally(() => setUploadingImage(false))
              }}
            >
              <Camera size={18} />
              <span>{uploadingImage ? '上传中...' : '添加图片'}</span>
            </button>
            <button
              onClick={handlePost}
              style={{
                ...styles.postBtn,
                opacity: (content.trim() || images.length > 0) && !posting ? 1 : 0.4
              }}
              disabled={!content.trim() && images.length === 0 || posting}
            >
              {posting ? '发布中...' : '发布'}
            </button>
          </div>
        </div>
      )}

      {dragOver && (
        <div style={styles.dragOverlay} onDragOver={(e) => e.preventDefault()} onDrop={handleDropMomentImage} onDragLeave={() => setDragOver(false)}>
          <Camera size={48} color="#a0a0b8" />
          <span style={{ marginTop: 12, color: '#a0a0b8', fontSize: 16 }}>松开以上传图片</span>
        </div>
      )}
    </div>
  )
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100%', background: '#0f0f1a' },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #2a2a4a'
  },
  title: { fontSize: 22, fontWeight: 700 },
  composeBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: 'linear-gradient(135deg, #ff4d4f, #e94560)',
    borderRadius: 20,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    boxShadow: '0 2px 12px rgba(233,69,96,0.4)'
  },
  composeLabel: { fontSize: 14, color: '#fff', fontWeight: 600 },
  feed: { flex: 1, overflowY: 'auto' },
  loading: { textAlign: 'center', color: '#6c6c80', padding: 40 },
  empty: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6c6c80'
  },
  moment: {
    padding: '16px 20px',
    borderBottom: '1px solid #1a1a2e'
  },
  momentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #e94560, #c73e54)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: 16
  },
  username: { display: 'block', fontWeight: 600, fontSize: 15 },
  time: { display: 'block', fontSize: 12, color: '#6c6c80', marginTop: 2 },
  deleteBtn: { marginLeft: 'auto', padding: 4, color: '#6c6c80' },
  content: { fontSize: 15, lineHeight: 1.6, marginBottom: 10, wordBreak: 'break-word' },
  imageGrid: {
    display: 'grid',
    gap: 4,
    gridTemplateColumns: 'repeat(3, 1fr)',
    marginBottom: 10
  },
  image: { width: '100%', aspectRatio: 1, objectFit: 'cover', borderRadius: 4 },
  imageSingle: { gridColumn: 'span 1', aspectRatio: '4/3' },
  actions: { display: 'flex', gap: 16, alignItems: 'center' },
  actionBtn: { display: 'flex', alignItems: 'center', gap: 4 },
  modal: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 100
  },
  modalContent: {
    width: '100%',
    maxWidth: 480,
    background: '#1a1a2e',
    borderRadius: '16px 16px 0 0',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 12
  },
  modalDragOver: {
    outline: '2px dashed #e94560',
    outlineOffset: '-4px',
    borderRadius: 12,
    background: 'rgba(233,69,96,0.05)'
  },
  dragOverlay: {
    position: 'fixed', inset: 0, zIndex: 150,
    background: 'rgba(15,15,26,0.85)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(4px)'
  },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 600 },
  closeBtn: { padding: 4, color: '#6c6c80', fontSize: 18 },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    background: '#16213e',
    borderRadius: 10,
    fontSize: 15,
    resize: 'none',
    color: '#fff',
    minHeight: 100
  },
  imagePreview: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  previewImgWrap: { position: 'relative' },
  previewImg: { width: 80, height: 80, objectFit: 'cover', borderRadius: 8 },
  removeImg: {
    position: 'absolute', top: -4, right: -4,
    background: '#e94560', borderRadius: '50%', padding: 2, color: '#fff'
  },
  addImgBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 14px', background: '#16213e', borderRadius: 10,
    color: '#a0a0b8', fontSize: 14, cursor: 'pointer', border: '1px dashed #2a2a4a'
  },
  addImgBtnUploading: { opacity: 0.5, pointerEvents: 'none' },
  postBtn: {
    padding: '12px', background: '#e94560', borderRadius: 10,
    color: '#fff', fontWeight: 600, fontSize: 16
  }
}
