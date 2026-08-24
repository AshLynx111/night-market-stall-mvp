import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const projectRoot = process.cwd()
const approvedRoot = path.join(projectRoot, 'src', 'assets', 'approved')
const runtimeRoot = path.join(projectRoot, 'src', 'assets', 'runtime')
const manifestPath = path.join(runtimeRoot, 'manifest.json')
const sourceRoots = [
  'main-ui',
  'menu',
  'events',
  'customers/emotions',
  'customers/motion',
  'stages',
]
const encoding = {
  format: 'webp',
  quality: 92,
  alphaQuality: 100,
  effort: 5,
  smartSubsample: true,
}
const checking = process.argv.includes('--check')
const jsonOutput = process.argv.includes('--json')

function slash(value) {
  return value.split(path.sep).join('/')
}

async function filesUnder(directory, predicate = () => true) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) return filesUnder(target, predicate)
    return predicate(target) ? [target] : []
  }))
  return files.flat()
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

async function exists(target) {
  try {
    await stat(target)
    return true
  } catch {
    return false
  }
}

async function readManifest() {
  try {
    return JSON.parse(await readFile(manifestPath, 'utf8'))
  } catch {
    return null
  }
}

function runtimeRelativeFor(sourceAbsolute) {
  const relative = slash(path.relative(approvedRoot, sourceAbsolute))
  return relative.replace(/\.png$/i, '.webp')
}

const sourceFiles = (await Promise.all(sourceRoots.map((relative) => (
  filesUnder(path.join(approvedRoot, relative), (file) => /\.png$/i.test(file))
)))).flat().sort()

if (sourceFiles.length === 0) throw new Error('No approved PNG sources found for runtime derivatives')

const previousManifest = await readManifest()
const previousBySource = new Map((previousManifest?.assets ?? []).map((entry) => [entry.source, entry]))
const assets = []
const errors = []

for (const sourceAbsolute of sourceFiles) {
  const source = slash(path.relative(projectRoot, sourceAbsolute))
  const runtimeRelative = runtimeRelativeFor(sourceAbsolute)
  const runtimeAbsolute = path.join(runtimeRoot, ...runtimeRelative.split('/'))
  const runtime = slash(path.relative(projectRoot, runtimeAbsolute))
  const sourceBuffer = await readFile(sourceAbsolute)
  const sourceHash = sha256(sourceBuffer)
  const previous = previousBySource.get(source)

  if (checking) {
    if (!previous) {
      errors.push(`Missing manifest entry: ${source}`)
      continue
    }
    if (previous.runtime !== runtime) errors.push(`Runtime path mismatch: ${source}`)
    if (previous.sourceHash !== sourceHash) errors.push(`Stale source hash: ${source}`)
    if (previous.sourceBytes !== sourceBuffer.length) errors.push(`Source byte mismatch: ${source}`)
    if (!(await exists(runtimeAbsolute))) {
      errors.push(`Missing runtime derivative: ${runtime}`)
      continue
    }
    const runtimeBytes = (await stat(runtimeAbsolute)).size
    if (previous.runtimeBytes !== runtimeBytes) errors.push(`Runtime byte mismatch: ${runtime}`)
    assets.push(previous)
    continue
  }

  const unchanged = previous?.sourceHash === sourceHash
    && previous?.runtime === runtime
    && await exists(runtimeAbsolute)
  const metadata = await sharp(sourceBuffer).metadata()
  if (!metadata.width || !metadata.height) throw new Error(`Missing image dimensions: ${source}`)
  if (!unchanged) {
    await mkdir(path.dirname(runtimeAbsolute), { recursive: true })
    await sharp(sourceBuffer).webp({
      quality: encoding.quality,
      alphaQuality: encoding.alphaQuality,
      effort: encoding.effort,
      smartSubsample: encoding.smartSubsample,
    }).toFile(runtimeAbsolute)
  }
  const runtimeBytes = (await stat(runtimeAbsolute)).size
  assets.push({
    source,
    runtime,
    sourceHash,
    width: metadata.width,
    height: metadata.height,
    sourceBytes: sourceBuffer.length,
    runtimeBytes,
  })
}

if (checking) {
  if (!previousManifest) errors.push('Missing runtime manifest')
  if (previousManifest && JSON.stringify(previousManifest.encoding) !== JSON.stringify(encoding)) {
    errors.push('Runtime encoding options do not match the builder')
  }
  const expectedRuntime = new Set(sourceFiles.map((file) => slash(path.join(runtimeRoot, runtimeRelativeFor(file)))))
  if (await exists(runtimeRoot)) {
    const actualRuntime = await filesUnder(runtimeRoot, (file) => /\.webp$/i.test(file))
    for (const file of actualRuntime) {
      if (!expectedRuntime.has(slash(file))) errors.push(`Orphaned runtime derivative: ${slash(path.relative(projectRoot, file))}`)
    }
  }
  if (previousManifest?.assets?.length !== sourceFiles.length) errors.push('Runtime manifest asset count is stale')
  if (errors.length) throw new Error(errors.join('\n'))
} else {
  await mkdir(runtimeRoot, { recursive: true })
  const expectedRuntime = new Set(assets.map((entry) => slash(path.resolve(projectRoot, entry.runtime))))
  const actualRuntime = await filesUnder(runtimeRoot, (file) => /\.webp$/i.test(file))
  for (const file of actualRuntime) {
    if (!expectedRuntime.has(slash(path.resolve(file)))) await rm(file)
  }
  const manifest = { version: 1, encoding, assets }
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
}

const sourceBytes = assets.reduce((sum, asset) => sum + asset.sourceBytes, 0)
const runtimeBytes = assets.reduce((sum, asset) => sum + asset.runtimeBytes, 0)
const report = {
  count: assets.length,
  sourceBytes,
  runtimeBytes,
  savedPercent: Math.round((1 - runtimeBytes / sourceBytes) * 100),
}

if (jsonOutput) process.stdout.write(`${JSON.stringify(report)}\n`)
else process.stdout.write(`Runtime WebP assets: ${report.count}, saved ${report.savedPercent}%\n`)
