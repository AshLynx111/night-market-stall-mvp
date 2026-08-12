import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const stageRoot = path.resolve(scriptDir, '../../src/assets/approved/stages')

const targets = [
  ['02-egg', 'classic-02-egg.png'],
  ['03-hot-dog', 'classic-03-hot-dog.png'],
]

async function renderHeatVariant(source, output, state) {
  let image = sharp(source).ensureAlpha()
  if (state === 'raw') image = image.modulate({ brightness: 0.92, saturation: 0.74 })
  if (state === 'ready') image = image.modulate({ brightness: 1.04, saturation: 1.08 })
  if (state === 'burnt') image = image.modulate({ brightness: 0.68, saturation: 1.18, hue: 12 })
  if (state === 'scorched') image = image.modulate({ brightness: 0.40, saturation: 0.36, hue: 18 })

  await image.png({ compressionLevel: 9, adaptiveFiltering: false }).toFile(output)
}

for (const [prefix, sourceName] of targets) {
  const source = path.join(stageRoot, 'classic', sourceName)
  for (const state of ['raw', 'ready', 'burnt', 'scorched']) {
    await renderHeatVariant(
      source,
      path.join(stageRoot, 'heat', 'classic', `${prefix}-${state}.png`),
      state,
    )
  }
}

process.stdout.write('Rebuilt 8 classic heat variants from the new cumulative stage art.\n')
