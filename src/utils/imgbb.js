const IMGBB_API_KEY = '3968df9b249e7986e04256f3ede4df2f'

async function compressToBlob(file, maxWidth = 800) {
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
        canvas.toBlob(blob => resolve(blob), 'image/jpeg', 0.8)
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
export async function uploadToImgbb(file, maxWidth = 800) {
  const blob = await compressToBlob(file, maxWidth)
  const form = new FormData()
  form.append('key', IMGBB_API_KEY)
  form.append('image', blob, 'upload.jpg')
  const res = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body: form })
  if (!res.ok) throw new Error(`imgbb 返回 ${res.status}`)
  const data = await res.json()
  if (!data.success) throw new Error(data.error?.message || 'imgbb 上传失败')
  return data.data.url
}

/**
 * 优先上传到 imgbb，失败时降级到 D1（后端存储）
 */
export async function uploadImage(file, maxWidth = 800) {
  try {
    return await uploadToImgbb(file, maxWidth)
  } catch {
    const blob = await compressToBlob(file, maxWidth)
    const arrayBuffer = await blob.arrayBuffer()
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)))
    const res = await fetch('/api/images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: base64, contentType: blob.type }),
    })
    if (!res.ok) throw new Error('图片上传失败')
    const json = await res.json()
    return json.url
  }
}
