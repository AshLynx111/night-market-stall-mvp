import { readdir, readFile } from 'node:fs/promises'
import { extname, join, relative } from 'node:path'

const root = process.cwd()
const sdkUrl = 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js'
const textExtensions = new Set(['.html', '.js', '.css', '.json', '.txt', '.xml', '.svg'])

async function filesUnder(directory) {
  const output = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) output.push(...await filesUnder(path))
    else output.push(path)
  }
  return output
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const standaloneFiles = await filesUnder(join(root, 'dist'))
const pokiFiles = await filesUnder(join(root, 'dist-poki'))
const readText = async (paths) => Promise.all(paths.filter((path) => textExtensions.has(extname(path))).map(async (path) => ({ path, text: await readFile(path, 'utf8') })))
const standaloneText = await readText(standaloneFiles)
const pokiText = await readText(pokiFiles)

assert(!standaloneText.some(({ text }) => text.includes('PokiSDK') || text.includes('game-cdn.poki.com')), 'Standalone build contains a Poki runtime reference.')
const pokiIndex = await readFile(join(root, 'dist-poki', 'index.html'), 'utf8')
const standaloneIndex = await readFile(join(root, 'dist', 'index.html'), 'utf8')
const sourceIndex = await readFile(join(root, 'index.html'), 'utf8')
const metadata = text => ({ lang: text.match(/<html lang="([^"]+)"/)[1], title: text.match(/<title>([^<]+)<\/title>/)[1], description: text.match(/<meta name="description" content="([^"]+)"/)[1] })
const standaloneMetadata = metadata(standaloneIndex)
const pokiMetadata = metadata(pokiIndex)
assert(JSON.stringify(standaloneMetadata) === JSON.stringify(metadata(sourceIndex)), 'Standalone metadata changed from source baseline.')
assert(standaloneMetadata.lang === 'zh-CN' && standaloneMetadata.title === '夜市大排档', 'Standalone baseline metadata regression.')
assert(pokiMetadata.lang === 'en' && pokiMetadata.title === 'Night Market: Street Food Stall', 'Poki static metadata is not English.')
assert(pokiMetadata.description === 'Cook street food, serve customers, and grow your night market stall.', 'Poki description mismatch.')
assert(pokiIndex.split(sdkUrl).length - 1 === 1, 'Poki index must include the official SDK URL exactly once.')
assert(!pokiFiles.some((path) => /PlaytestDebugPanel|\.map$/i.test(path)), 'Poki output contains a debug chunk or source map.')

for (const { path, text } of pokiText) {
  const urls = text.match(/https?:\/\/[^\s"'`)<]+/g) ?? []
  for (const url of urls) {
    const inertRuntimeLiteral = url.startsWith('https://react.dev/errors/') || url.startsWith('http://www.w3.org/')
    assert(url === sdkUrl || inertRuntimeLiteral, `Unexpected external URL in ${relative(root, path)}: ${url}`)
  }
  assert(!/googletagmanager|google-analytics|crazygames|adsense|doubleclick\.net|amazon-adsystem|imasdk\.googleapis|fonts\.googleapis/i.test(text), `Forbidden integration in ${relative(root, path)}`)
}

for (const path of pokiFiles) {
  const name = relative(join(root, 'dist-poki'), path).replaceAll('\\', '/')
  assert(!/(^|\/)(src|docs|tests?|screenshots)(\/|$)|\.git|qa.*\.json$/i.test(name), `Non-production file in Poki build: ${name}`)
}

console.log(`Platform build audit passed: standalone=${standaloneFiles.length} files, poki=${pokiFiles.length} files, external=${sdkUrl}`)
console.log(JSON.stringify({ standaloneMetadata, pokiMetadata, gameUnexpectedExternalUrls: 0, pokiDownstreamStatus: 'PENDING LIVE INSPECTOR' }, null, 2))
