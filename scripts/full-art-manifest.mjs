import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const approvedRoot = path.join(repoRoot, 'src', 'assets', 'approved')
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const APPROVED_SCREEN_SOURCES = {
  'main-ui/home-screen-user-final.png': 'codex-clipboard-1cde6623-3059-49ba-9d9e-79c321252e46.png',
  'main-ui/day-select-user-final.png': 'codex-clipboard-120d0c91-8034-4c0c-9b82-d8123a5d9f2c.png',
  'main-ui/kitchen-screen-user-final.png': 'codex-clipboard-2c88d9c3-bf27-4bb2-9bd6-8374003fa788.png',
  'main-ui/summary-screen-user-final.png': 'codex-clipboard-81bdc683-a5ab-4ad6-86e4-b41ff4b3dd13.png',
  'main-ui/settings-screen-user-final.png': 'codex-clipboard-f4d932fe-0a5d-41e2-9b15-7e236745d7d1.png',
}

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolute = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(absolute) : [absolute]
  }))
  return nested.flat()
}

async function pngMetadata(absolutePath) {
  const handle = await fs.open(absolutePath, 'r')
  try {
    const header = Buffer.alloc(33)
    const { bytesRead } = await handle.read(header, 0, header.length, 0)
    if (bytesRead < 33 || !header.subarray(0, 8).equals(PNG_SIGNATURE)) {
      throw new Error(`Invalid PNG signature: ${absolutePath}`)
    }
    return {
      width: header.readUInt32BE(16),
      height: header.readUInt32BE(20),
      bitDepth: header[24],
      colorType: header[25],
    }
  } finally {
    await handle.close()
  }
}

function roleFor(relativePath) {
  if (relativePath.startsWith('customers/emotions/')) return 'emotion'
  if (relativePath.startsWith('customers/motion/')) return 'motion-atlas'
  if (relativePath.startsWith('customers/final-light-anime/')) return 'neutral-export'
  if (/^customers\/customer-/.test(relativePath)) return 'neutral-source-export'
  if (relativePath.startsWith('events/')) return 'event-key-art'
  if (relativePath in APPROVED_SCREEN_SOURCES) return 'approved-screen-composite'
  if (relativePath === 'main-ui/kitchen-screen-live-clean.png') return 'approved-screen-live-derivative'
  if (relativePath === 'main-ui/settings-slider-clean-patch.png') return 'approved-screen-clean-patch'
  if (relativePath === 'main-ui/night-market-clean-background.png') return 'clean-background'
  if (relativePath === 'main-ui/game-main-screen-final.png') return 'screen-composite'
  if (relativePath === 'main-ui/start-screen-user-final.png') return 'start-screen-composite'
  if (relativePath.startsWith('menu/dishes/')) return 'finished-dish'
  if (relativePath.startsWith('menu/ingredient-bins/')) return 'tabletop-ingredient-bin'
  if (relativePath.startsWith('menu/ingredients/')) return 'tabletop-ingredient'
  if (relativePath === 'menu/menu-board.svg') return 'editable-menu'
  if (relativePath === 'menu/menu-board.png') return 'menu-raster-export'
  if (relativePath === 'menu/takeaway-bag.png') return 'packaging'
  if (relativePath.endsWith('-stage-atlas.png')) return 'stage-atlas'
  if (relativePath.startsWith('stages/heat/')) return 'heat-stage'
  if (relativePath.startsWith('stages/flattened/')) return 'precomposed-stage'
  if (relativePath.startsWith('stages/modifiers/')) return 'modifier-stage'
  if (relativePath.startsWith('stages/')) return 'cumulative-stage'
  return 'unclassified'
}

function derivativeFor(relativePath) {
  if (relativePath in APPROVED_SCREEN_SOURCES) {
    return `user-supplied source: ${APPROVED_SCREEN_SOURCES[relativePath]}`
  }
  if (relativePath.startsWith('customers/motion/')) {
    return `masters/customers/${path.posix.basename(relativePath, '-motion.png')}`
  }
  if (relativePath.startsWith('customers/emotions/')) {
    return `masters/${relativePath.replace(/\.png$/, '')}`
  }
  if (relativePath.startsWith('customers/final-light-anime/')) {
    const id = path.posix.basename(relativePath, '.png')
    return `customers/emotions/${id}/waiting.png`
  }
  if (/^customers\/customer-/.test(relativePath)) {
    const id = path.posix.basename(relativePath, '.png')
    return `customers/emotions/${id}/waiting.png`
  }
  if (relativePath === 'menu/menu-board.png') return 'menu/menu-board.svg'
  if (relativePath === 'main-ui/game-main-screen-final.png') {
    return 'main-ui/night-market-clean-background.png + runtime layout reference'
  }
  if (relativePath === 'main-ui/start-screen-user-final.png') {
    return 'user-supplied approved start-screen reference'
  }
  if (relativePath === 'main-ui/kitchen-screen-live-clean.png') {
    return 'main-ui/kitchen-screen-user-final.png; customer region replaced for dynamic live actors'
  }
  if (relativePath === 'main-ui/settings-slider-clean-patch.png') {
    return 'main-ui/settings-screen-user-final.png; localized baked-slider cleanup patch'
  }
  const atlasMatch = relativePath.match(/^stages\/(.+)-stage-atlas\.png$/)
  if (atlasMatch) return `stages/${atlasMatch[1]}/*.png`
  return undefined
}

function requiresAlpha(relativePath) {
  if (!relativePath.endsWith('.png')) return false
  if (relativePath === 'main-ui/settings-slider-clean-patch.png') return true
  if (relativePath.startsWith('main-ui/')) return false
  if (relativePath.startsWith('events/')) return false
  if (relativePath === 'menu/menu-board.png') return false
  if (relativePath.endsWith('-stage-atlas.png')) return false
  return true
}

export async function buildFullArtManifest() {
  const files = (await walk(approvedRoot))
    .map((absolutePath) => ({
      absolutePath,
      relativePath: path.relative(approvedRoot, absolutePath).split(path.sep).join('/'),
    }))
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath, 'en'))

  const assets = []
  for (const file of files) {
    const extension = path.extname(file.relativePath).toLowerCase()
    const metadata = extension === '.png' ? await pngMetadata(file.absolutePath) : null
    const derivedFrom = derivativeFor(file.relativePath)
    assets.push({
      path: file.relativePath,
      family: file.relativePath.split('/')[0],
      role: roleFor(file.relativePath),
      width: metadata?.width ?? null,
      height: metadata?.height ?? null,
      bitDepth: metadata?.bitDepth ?? null,
      colorType: metadata?.colorType ?? null,
      alphaRequired: requiresAlpha(file.relativePath),
      ...(derivedFrom ? { derivedFrom } : {}),
    })
  }
  return {
    schemaVersion: 1,
    assetRoot: 'src/assets/approved',
    count: assets.length,
    assets,
  }
}

async function main() {
  const manifest = await buildFullArtManifest()
  const json = `${JSON.stringify(manifest, null, 2)}\n`
  const writeIndex = process.argv.indexOf('--write')
  if (writeIndex >= 0) {
    const destination = process.argv[writeIndex + 1]
    if (!destination) throw new Error('--write requires a destination path')
    const absoluteDestination = path.resolve(repoRoot, destination)
    await fs.mkdir(path.dirname(absoluteDestination), { recursive: true })
    await fs.writeFile(absoluteDestination, json)
  }
  if (process.argv.includes('--json') || writeIndex < 0) process.stdout.write(json)
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
