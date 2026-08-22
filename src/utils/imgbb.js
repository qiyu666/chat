/**
 * 将图片文件压缩并上传到 imgbb（直接调用 imgbb API，Capacitor 环境无 CORS 限制）
 * @param {File} file - 图片文件
 * @param {number} maxWidth - 最大宽度，默认 800px
 * @returns {Promise<string>} 上传后的图片 URL
 */
const IMGBB_API_KEY = 'a3c4d52586dedcc730da4af027c12ebf'

export async function uploadToImgbb(file, maxWidth = 800) {
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
        const base64 = canvas.toDataURL('image/jpeg', 0.8).split(',')[1]
        try {
          const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ image: base64 })
          })
          if (!res.ok) throw new Error(`imgbb 返回 ${res.status}`)
          const data = await res.json()
          if (!data.success) throw new Error(data.error?.message || '上传失败')
          resolve(data.data.url)
        } catch (e) {
          reject(e instanceof Error ? e : new Error('imgbb 上传失败'))
        }
      }
      img.onerror = () => reject(new Error('图片解析失败'))
      img.src = reader.result
    }
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(file)
  })
}
