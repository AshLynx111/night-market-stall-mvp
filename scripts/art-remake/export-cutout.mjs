import { promises as fs } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

function alphaForDistance(distance, transparentThreshold, opaqueThreshold) {
  if (distance <= transparentThreshold) return 0
  if (distance >= opaqueThreshold) return 1
  return (distance - transparentThreshold) / (opaqueThreshold - transparentThreshold)
}

export async function exportCutout(input, output, options = {}) {
  const {
    key = [0, 255, 0],
    transparentThreshold = 12,
    opaqueThreshold = 220,
    despill = true,
  } = options
  if (opaqueThreshold <= transparentThreshold) {
    throw new Error('opaqueThreshold must be greater than transparentThreshold')
  }

  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const result = Buffer.from(data)
  for (let offset = 0; offset < result.length; offset += 4) {
    const redDistance = result[offset] - key[0]
    const greenDistance = result[offset + 1] - key[1]
    const blueDistance = result[offset + 2] - key[2]
    const distance = Math.sqrt(
      redDistance * redDistance + greenDistance * greenDistance + blueDistance * blueDistance,
    )
    const matte = alphaForDistance(distance, transparentThreshold, opaqueThreshold)
    result[offset + 3] = Math.round(result[offset + 3] * matte)

    if (despill && key[1] > key[0] && key[1] > key[2] && matte < 1) {
      const neutralGreen = Math.max(result[offset], result[offset + 2])
      const spill = Math.max(0, result[offset + 1] - neutralGreen)
      result[offset + 1] = Math.round(result[offset + 1] - spill * (1 - matte))
    }
  }

  await fs.mkdir(path.dirname(output), { recursive: true })
  await sharp(result, { raw: info }).png({ compressionLevel: 9, adaptiveFiltering: false }).toFile(output)
  return output
}
