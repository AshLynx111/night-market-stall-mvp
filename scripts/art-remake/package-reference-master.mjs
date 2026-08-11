import { createHash } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'

const repo = process.cwd()
const destination = path.join(repo, 'deliverables', 'night-market-reference-master-final-art')
const artSource = path.join(repo, 'src', 'assets', 'approved')
const artDestination = path.join(destination, '01-runtime-art')

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(absolute) : [absolute]
  }))
  return nested.flat()
}

await fs.rm(destination, { recursive: true, force: true })
await fs.mkdir(destination, { recursive: true })
await fs.cp(artSource, artDestination, { recursive: true })

const previewSource = path.join(repo, 'artifacts', 'reference-remake', 'review')
const previewDestination = path.join(destination, '02-preview-contact-sheets')
await fs.mkdir(previewDestination, { recursive: true })
for (const name of [
  'scene-ui-contact-sheet.png',
  'food-contact-sheet.png',
  'stage-contact-sheet.png',
  'regular-customer-emotions-contact-sheet.png',
  'celebrity-emotions-contact-sheet.png',
  'current-gameplay.png',
  'current-gameplay-day3.png',
]) {
  const source = path.join(previewSource, name)
  try { await fs.copyFile(source, path.join(previewDestination, name)) } catch { /* optional preview */ }
}

const docsDestination = path.join(destination, '03-implementation-docs')
await fs.mkdir(docsDestination, { recursive: true })
for (const relative of [
  'docs/superpowers/specs/2026-08-11-reference-master-full-art-remake-design.md',
  'docs/superpowers/plans/2026-08-11-reference-master-full-art-remake-implementation.md',
  'artifacts/reference-remake/manifests/full-art-manifest.json',
]) {
  const source = path.join(repo, relative)
  await fs.copyFile(source, path.join(docsDestination, path.basename(relative)))
}

const files = (await walk(artDestination)).sort()
const assets = []
for (const absolute of files) {
  const bytes = await fs.readFile(absolute)
  assets.push({
    path: path.relative(artDestination, absolute).split(path.sep).join('/'),
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex'),
  })
}

const packageManifest = {
  schemaVersion: 1,
  title: '夜市烤冷面 · 参考图定稿美术完整包',
  generatedAt: new Date().toISOString(),
  assetCount: assets.length,
  artRoot: '01-runtime-art',
  visualReference: '用户确认的深蓝夜市、暖灯、木牌奶油绿金UI、轻二次元2.5D人物主界面',
  assets,
}
await fs.writeFile(path.join(destination, 'manifest.json'), `${JSON.stringify(packageManifest, null, 2)}\n`)

const readme = `# 夜市烤冷面 · 参考图定稿美术完整包

本文件夹是按最终确认主界面统一重制的完整美术交付，共 ${assets.length} 个运行时素材。

## 文件夹

- \`01-runtime-art/main-ui\`：最终主界面与干净背景
- \`01-runtime-art/menu\`：菜单、5款成品、18种食材、包装
- \`01-runtime-art/stages\`：每个配方的累计制作阶段、火候、加料与图集
- \`01-runtime-art/customers\`：10位常规顾客、7种情绪、入场/离场动作图集
- \`01-runtime-art/events\`：第五天男明星事件美术
- \`02-preview-contact-sheets\`：总览与实机预览
- \`03-implementation-docs\`：实施方案与251项资产清单
- \`manifest.json\`：每个素材的路径、体积和SHA-256校验值

所有可交互食材均为透明PNG，人物与制作阶段已直接接入游戏运行时。
`
await fs.writeFile(path.join(destination, 'README.md'), readme)
console.log(`${destination}\nassets=${assets.length}`)
