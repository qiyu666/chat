/**
 * 将 src/worker.js 打包为无 ES Module 语法的单文件
 * 用于直接粘贴到 Cloudflare Dashboard
 */
const fs = require('fs')
const path = require('path')

const src = fs.readFileSync(path.join(__dirname, '../src/worker.js'), 'utf8')

let bundle = src
  // 去掉 export default { 这行，改为 module.exports = {
  .replace(/^export default \{$/m, 'module.exports = {')

const outPath = path.join(__dirname, '../src/worker-dashboard.js')
fs.writeFileSync(outPath, bundle)
console.log('✅ Bundled -> ' + outPath)
console.log('将此文件完整内容粘贴到 Cloudflare Dashboard > Workers & Pages > Edit code')
