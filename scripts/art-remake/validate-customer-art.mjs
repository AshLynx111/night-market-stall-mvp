import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import sharp from 'sharp'

const root = process.cwd()
const customerRoot = path.join(root, 'src', 'assets', 'approved', 'customers')
const regularIdentities = [
  'customer-01-xiaolin', 'customer-02-ajie', 'customer-03-xiaoyu', 'customer-04-senior',
  'customer-05-suqing', 'customer-06-dazhuang', 'customer-07-xuyan', 'customer-08-azhe',
  'customer-09-teacher-chen', 'customer-10-grandma-wang',
]
const emotions = ['arriving', 'ordering', 'waiting', 'impatient', 'urgent', 'happy', 'disappointed']
const celebrityOnly = process.argv.includes('--celebrity-only')
const identities = celebrityOnly ? ['celebrity'] : regularIdentities

async function assertGeometry(file, width, height, transparentCorners = true) {
  const image = sharp(file).ensureAlpha()
  const metadata = await image.metadata()
  if (metadata.width !== width || metadata.height !== height) {
    throw new Error(`${path.relative(root, file)} expected ${width}x${height}`)
  }
  if (!transparentCorners) return
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true })
  const indexes = [0, (info.width - 1) * info.channels, (info.height - 1) * info.width * info.channels, ((info.width * info.height) - 1) * info.channels]
  if (indexes.some((index) => data[index + 3] !== 0)) throw new Error(`${path.relative(root, file)} has an opaque corner`)
}

async function hash(file) {
  return crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex')
}

let emotionDiversityVerified = true
for (const identity of identities) {
  const emotionFiles = emotions.map((emotion) => path.join(customerRoot, 'emotions', identity, `${emotion}.png`))
  await Promise.all(emotionFiles.map((file) => assertGeometry(file, 384, 512)))
  const hashes = await Promise.all(emotionFiles.map(hash))
  if (new Set(hashes).size !== emotions.length) emotionDiversityVerified = false
  await assertGeometry(path.join(customerRoot, 'motion', `${identity}-motion.png`), 2048, 1152)
  if (identity !== 'celebrity') {
    await assertGeometry(path.join(customerRoot, 'final-light-anime', `${identity}.png`), 330, 449)
    await assertGeometry(path.join(customerRoot, `${identity}.png`), 1024, 1024)
  }
}

if (!emotionDiversityVerified) throw new Error('At least one customer has duplicate emotion exports')

const result = {
  identities: identities.length,
  emotions: identities.length * emotions.length,
  motionAtlases: identities.length,
  neutralExports: celebrityOnly ? 0 : identities.length,
  sourceExports: celebrityOnly ? 0 : identities.length,
  eventKeyArt: celebrityOnly ? 1 : 0,
  transparentCornersVerified: true,
  emotionDiversityVerified,
  motionGeometryVerified: true,
  eventGeometryVerified: celebrityOnly,
}

if (celebrityOnly) {
  await assertGeometry(path.join(root, 'src', 'assets', 'approved', 'events', 'day5-celebrity-event-key-art.png'), 1440, 810, false)
}

if (process.argv.includes('--json')) process.stdout.write(`${JSON.stringify(result)}\n`)
else process.stdout.write(`Validated ${result.identities} customer identities and ${result.emotions} emotion exports.\n`)
