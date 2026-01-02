const path = require('path')
const fs = require('fs')

// 从 VERSION 文件读取版本号
const versionFile = path.resolve(__dirname, '../../VERSION')
const version = fs.readFileSync(versionFile, 'utf-8').trim()

// 更新 simple-mind-map/package.json
const pkgPath = path.resolve(__dirname, '../../simple-mind-map/package.json')
const pkg = require(pkgPath)
pkg.version = version
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

// 更新 simple-mind-map/full.js
const fullPath = path.resolve(__dirname, '../../simple-mind-map/full.js')
let content = fs.readFileSync(fullPath, 'utf-8')
content = content.replace(
  /(MindMap.version\s*=\s*)[^\n]+(\n)/,
  `$1'${version}'$2`
)
fs.writeFileSync(fullPath, content)