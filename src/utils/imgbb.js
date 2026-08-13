/**
 * 将图片文件压缩并上传到 imgbb（通过 mock server 代理，避免浏览器 CORS）
 * @param {File} file - 图片文件
 * @param {number} maxWidth - 最大宽度，默认 800px
 * @returns {Promise<string>} 上传后的图片 URL
 */
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
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8)
        try {
          const res = await fetch('/api/upload/imgbb', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: compressedDataUrl })
          })
          if (!res.ok) {
            const text = await res.text()
            throw new Error(`服务响应异常 (${res.status}): ${text.substring(0, 80)}`)
          }
          const data = await res.json()
          if (data.error) throw new Error(data.error)
          resolve(data.url)
        } catch (e) {
          if (e instanceof Error) reject(e)
          else reject(new Error('网络错误，请检查服务是否正常'))
        }
      }
      img.onerror = () => reject(new Error('图片解析失败'))
      img.src = reader.result
    }
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(file)
  })
}
