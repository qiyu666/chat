const IMGBB_API_KEY = '4a2f70bc56858e3c4864cd7f058fa9f4'
const TIMEOUT_MS = 6000 // imgbb 直连超时（用户网络到 imgbb 不稳时快速降级）

async function compressToBlob(file, maxWidth = 600) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const img = new Image()
      img.onload = async () => {
        const canvas = document.createElement('canvas')
        let width = img.naturalWidth
        let height = img.naturalHeight
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.7)
          .catch(() => reject(new Error('图片压缩失败')))
      }
      img.onerror = () => reject(new Error('图片解析失败'))
      reader.readAsDataURL(file)
    }
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(file)
  })
}

/**
 * 上传到 imgbb（外部服务，不依赖后端）
 */
export async function uploadToImgbb(file, maxWidth = 600) {
  const blob = await compressToBlob(file, maxWidth)
  const form = new FormData()
  form.append('key', IMGBB_API_KEY)
  form.append('image', blob, 'upload.jpg')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form, signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) throw new Error(`imgbb 返回 ${res.status}`)
    const data = await res.json()
    if (!data.success) throw new Error(data.error?.message || 'imgbb 上传失败')
    return data.data.url
  } catch (e) {
    clearTimeout(timeout)
    throw e
  }
}

/**
 * 降级：上传到 Cloudflare Worker（D1 存储）
 */
const API_BASE = 'https://chat-api.aiit.cc.cd/api'

async function uploadToWorker(blob, token) {
  const arrayBuffer = await blob.arrayBuffer()
  // 分块 btoa，避免大图片时 String.fromCharCode 展开爆栈
  const bytes = new Uint8Array(arrayBuffer)
  let base64 = ''
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    base64 += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK))
  }
  const b64 = btoa(base64)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${API_BASE}/images`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ data: b64, contentType: blob.type }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) {
      const err = await res.json().catch(() => null)
      throw new Error(err?.error || `服务端返回 ${res.status}`)
    }
    const json = await res.json()
    // Worker 返回相对路径 /api/images/:id，补全为完整 URL
    return json.url.startsWith('http') ? json.url : `${API_BASE}${json.url}`
  } catch (err) {
    clearTimeout(timeout)
    throw err
  }
}

/**
 * 图片上传：优先 D1（自家 Worker，国内快），失败时降级到 imgbb
 * 压缩后一般 < 500KB，D1 单行写入 1MB 限制内可覆盖绝大多数场景
 */
export async function uploadImage(file, maxWidth = 600) {
  const blob = await compressToBlob(file, maxWidth)
  if (blob.size > 900 * 1024) {
    throw new Error('图片太大，请压缩后重新发送')
  }
  // 优先走自家 D1（国内访问快）
  try {
    const token = localStorage.getItem('token')
    return await uploadToWorker(blob, token)
  } catch (e) {
    console.warn('[img] D1 上传失败，降级到 imgbb:', e.message)
    return await uploadToImgbb(file, maxWidth)
  }
}
