import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildFullArtManifest } from './full-art-manifest.mjs'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function validate() {
  const manifest = await buildFullArtManifest()
  const errors = []
  const expectedFamilies = ['customers', 'events', 'main-ui', 'menu', 'stages']
  const families = [...new Set(manifest.assets.map((asset) => asset.family))].sort()

  if (manifest.count !== 251) errors.push(`Expected 251 assets, found ${manifest.count}`)
  if (JSON.stringify(families) !== JSON.stringify(expectedFamilies)) {
    errors.push(`Unexpected families: ${families.join(', ')}`)
  }

  for (const asset of manifest.assets) {
    const absolutePath = path.join(repoRoot, manifest.assetRoot, ...asset.path.split('/'))
    const stat = await fs.stat(absolutePath).catch(() => null)
    if (!stat?.isFile() || stat.size === 0) errors.push(`${asset.path}: missing or empty`)
    if (asset.path.endsWith('.png')) {
      if (!asset.width || !asset.height) errors.push(`${asset.path}: invalid dimensions`)
      if (asset.bitDepth !== 8) errors.push(`${asset.path}: expected 8-bit PNG, found ${asset.bitDepth}`)
      if (asset.alphaRequired && ![4, 6].includes(asset.colorType)) {
        errors.push(`${asset.path}: expected PNG alpha color type, found ${asset.colorType}`)
      }
    }
    if (asset.role === 'unclassified') errors.push(`${asset.path}: unclassified role`)
  }

  if (errors.length) {
    throw new Error(`Full art validation failed:\n${errors.map((error) => `- ${error}`).join('\n')}`)
  }

  console.log(`Validated ${manifest.count} art assets across ${families.length} families`)
}

validate().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
