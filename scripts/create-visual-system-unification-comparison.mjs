import path from 'node:path'
import sharp from 'sharp'

const root = process.cwd()
const screenshotsRoot = path.join(root, 'docs', 'qa', 'screenshots')
const beforeDir = path.join(screenshotsRoot, 'full-visual-consistency-v1')
const afterDir = path.join(screenshotsRoot, 'visual-system-unification-v1')

async function compare(filename, outputName) {
  const beforePath = path.join(beforeDir, filename)
  const afterPath = path.join(afterDir, filename)
  const [beforeMeta, afterMeta] = await Promise.all([
    sharp(beforePath).metadata(),
    sharp(afterPath).metadata(),
  ])
  const width = Math.max(beforeMeta.width ?? 0, afterMeta.width ?? 0)
  const height = Math.max(beforeMeta.height ?? 0, afterMeta.height ?? 0)
  const labelHeight = 58
  const label = Buffer.from(`
    <svg width="${width * 2}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${width * 2}" height="${labelHeight}" fill="#0b1424"/>
      <text x="${width / 2}" y="38" text-anchor="middle" fill="#f7e6bd" font-family="Arial, sans-serif" font-size="25" font-weight="700">BEFORE · BASELINE</text>
      <text x="${width + width / 2}" y="38" text-anchor="middle" fill="#ffd88a" font-family="Arial, sans-serif" font-size="25" font-weight="700">AFTER · UNIFIED</text>
      <rect x="${width - 1}" width="2" height="${labelHeight}" fill="#d99a3d"/>
    </svg>
  `)

  await sharp({
    create: {
      width: width * 2,
      height: height + labelHeight,
      channels: 4,
      background: '#0b1424',
    },
  }).composite([
    { input: label, left: 0, top: 0 },
    { input: beforePath, left: 0, top: labelHeight },
    { input: afterPath, left: width, top: labelHeight },
  ]).png().toFile(path.join(afterDir, outputName))
}

await compare('contact-sheet-1440x810.png', 'before-after-contact-sheet-1440x810.png')
await compare('contact-sheet-844x390.png', 'before-after-contact-sheet-844x390.png')
await compare('09-rotate-prompt-390x844.png', 'before-after-rotate-prompt-390x844.png')

process.stdout.write('Created desktop, mobile landscape, and rotate-prompt comparisons.\n')
