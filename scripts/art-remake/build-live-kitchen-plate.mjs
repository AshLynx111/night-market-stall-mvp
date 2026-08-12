import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import sharp from 'sharp'

export const approvedPath = 'src/assets/approved/main-ui/kitchen-screen-user-final.png'
export const cleanPath = 'src/assets/art-source/kitchen-live-inpaint-source.png'
export const outputPath = 'src/assets/approved/main-ui/kitchen-screen-live-clean.png'

export const MASK_RECTS = [
  { left: 570, top: 120, width: 210, height: 190 },
  { left: 740, top: 120, width: 220, height: 190 },
  { left: 1120, top: 120, width: 220, height: 190 },
  { left: 320, top: 205, width: 235, height: 330 },
  { left: 665, top: 205, width: 310, height: 330 },
  { left: 1050, top: 205, width: 280, height: 330 },
]

export async function buildLiveKitchenPlate({ output = outputPath } = {}) {
  const base = await sharp(approvedPath).png().toBuffer()
  const clean = await sharp(cleanPath).png().toBuffer()
  const overlays = []

  for (const rect of MASK_RECTS) {
    const patch = await sharp(clean).extract(rect).png().toBuffer()
    const feather = 2
    const alpha = Buffer.alloc(rect.width * rect.height)
    for (let y = 0; y < rect.height; y += 1) {
      for (let x = 0; x < rect.width; x += 1) {
        const edgeDistance = Math.min(x, y, rect.width - 1 - x, rect.height - 1 - y)
        alpha[y * rect.width + x] = Math.round(255 * Math.min(1, edgeDistance / feather))
      }
    }
    const feathered = await sharp(patch).joinChannel(alpha, { raw: { width: rect.width, height: rect.height, channels: 1 } }).png().toBuffer()
    overlays.push({ input: feathered, left: rect.left, top: rect.top })
  }

  await sharp(base).composite(overlays).png({ compressionLevel: 9 }).toFile(output)
  return output
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const builtPath = await buildLiveKitchenPlate()
  process.stdout.write(`${builtPath}\n`)
}
