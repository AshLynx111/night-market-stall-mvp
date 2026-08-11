import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { buildContactSheet } from './build-contact-sheet.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const sceneRoot = path.join(repoRoot, 'artifacts', 'reference-remake', 'masters', 'scene')
const uiRoot = path.join(repoRoot, 'artifacts', 'reference-remake', 'masters', 'ui')
const runtimeRoot = path.join(repoRoot, 'src', 'assets', 'approved', 'main-ui')
const reviewRoot = path.join(repoRoot, 'artifacts', 'reference-remake', 'review')

async function fit(input) {
  return sharp(input).resize(1440, 810, { fit: 'fill' }).png({ compressionLevel: 9, adaptiveFiltering: false }).toBuffer()
}

async function main() {
  await fs.mkdir(runtimeRoot, { recursive: true })
  await fs.mkdir(reviewRoot, { recursive: true })
  const background = await fit(path.join(sceneRoot, 'night-market-background-master.png'))
  const counter = await fit(path.join(sceneRoot, 'counter-and-griddles-master.png'))
  const ui = await fit(path.join(uiRoot, 'ui-material-kit-master.png'))
  const cleanScene = path.join(runtimeRoot, 'night-market-clean-background.png')
  const mainScreen = path.join(runtimeRoot, 'game-main-screen-final.png')

  await sharp(background)
    .composite([{ input: counter, left: 0, top: 0 }])
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(cleanScene)
  await sharp(background)
    .composite([{ input: counter, left: 0, top: 0 }, { input: ui, left: 0, top: 0 }])
    .png({ compressionLevel: 9, adaptiveFiltering: false })
    .toFile(mainScreen)

  await buildContactSheet([
    { path: path.join(sceneRoot, 'night-market-background-master.png'), label: 'background' },
    { path: cleanScene, label: 'scene' },
    { path: mainScreen, label: 'hud' },
  ], path.join(reviewRoot, 'scene-ui-contact-sheet.png'), { columns: 1, cellWidth: 1440, cellHeight: 810 })
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
