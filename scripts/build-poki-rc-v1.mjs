import { execFileSync } from 'node:child_process'
import { readdir, readFile, writeFile, stat, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'

const root = process.cwd()
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
const sourceCommit = git('rev-parse', 'HEAD')
if (git('branch', '--show-current') !== 'codex/poki-submission-rc-v1') throw new Error('Wrong RC branch')
if (git('diff', 'HEAD', '--name-only', '--', 'src', 'public', 'index.html', 'vite.config.ts', 'package.json', 'package-lock.json')) throw new Error('Commit build inputs before packaging')
const version = `poki-rc-v1+${sourceCommit.slice(0, 12)}`
execFileSync('powershell.exe', ['-NoProfile', '-Command', 'npm run build:poki; exit $LASTEXITCODE'], { stdio: 'inherit', env: { ...process.env, VITE_BUILD_VERSION: version } })
execFileSync(process.execPath, ['scripts/audit-platform-builds.mjs'], { stdio: 'inherit' })
const dist = path.join(root, 'dist-poki')
async function walk(directory) {
  const files = []
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name)
    if (item.isDirectory()) files.push(...await walk(file)); else files.push(file)
  }
  return files
}
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const files = []
for (const file of await walk(dist)) {
  const name = path.relative(dist, file).replaceAll('\\', '/')
  if (name !== 'index.html' && !/^assets\/[^/]+-[\w-]{8}\.(js|css|webp|mp3)$/.test(name)) throw new Error(`Non-production or unhashed asset: ${name}`)
  const bytes = await readFile(file)
  files.push({ path: name, bytes: bytes.length, sha256: hash(bytes), ...(/\.(js|css)$/.test(name) ? { gzipBytes: gzipSync(bytes).length } : {}) })
}
const index = await readFile(path.join(dist, 'index.html'), 'utf8')
const entryJs = index.match(/src="\.\/([^\"]+\.js)"/)[1]
const entryCss = index.match(/href="\.\/([^\"]+\.css)"/)[1]
if (!(await readFile(path.join(dist, entryJs), 'utf8')).includes(version)) throw new Error('Existing VITE_BUILD_VERSION injection missing')
const zipPath = path.join(root, 'night-market-poki-rc-v1.zip')
execFileSync('pwsh', ['-NoProfile', '-File', 'scripts/package-poki-rc.ps1', '-SourceDirectory', dist, '-ZipPath', zipPath], { stdio: 'inherit' })
const duplicateGroups = Object.values(Object.groupBy(files, f => f.sha256)).filter(group => group.length > 1).map(group => group.map(f => f.path))
const manifest = {
  version, sourceCommit, branch: git('branch', '--show-current'), builtAt: new Date().toISOString(),
  runtimeBaselineCommit: git('rev-parse', '5848d84'),
  zip: { filename: path.basename(zipPath), bytes: (await stat(zipPath)).size, sha256: hash(await readFile(zipPath)), entriesVerifiedAgainstDist: files.length },
  distBytes: files.reduce((n, f) => n + f.bytes, 0), fileCount: files.length,
  initialJs: files.find(f => f.path === entryJs), initialCss: files.find(f => f.path === entryCss),
  largest10: [...files].sort((a,b) => b.bytes - a.bytes).slice(0,10),
  imageBytes: files.filter(f => /\.webp$/.test(f.path)).reduce((n,f) => n+f.bytes,0),
  imageCount: files.filter(f => /\.webp$/.test(f.path)).length,
  audioBytes: files.filter(f => /\.mp3$/.test(f.path)).reduce((n,f) => n+f.bytes,0),
  duplicateGroups, files,
}
await mkdir('releases', { recursive: true })
await writeFile('releases/poki-rc-v1-manifest.json', JSON.stringify(manifest, null, 2) + '\n')
await writeFile('releases/night-market-poki-rc-v1.zip.sha256', `${manifest.zip.sha256}  ${manifest.zip.filename}\n`)
console.log(JSON.stringify({ version, sourceCommit, zip: manifest.zip, distBytes: manifest.distBytes, initialJs: manifest.initialJs, initialCss: manifest.initialCss, duplicateGroups }, null, 2))
