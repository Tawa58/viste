#!/usr/bin/env node
/**
 * Bump the desktop app version (electron/package.json) using semver.
 *
 *   npm run desktop:version -- patch   1.0.0 -> 1.0.1  (bug fixes)
 *   npm run desktop:version -- minor   1.0.1 -> 1.1.0  (new features)
 *   npm run desktop:version -- major   1.1.0 -> 2.0.0  (breaking changes)
 *   npm run desktop:version -- 1.4.2   explicit version
 *
 * Prints the git commands to commit, tag, and push the release.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))
const bump = (process.argv[2] || '').trim()

const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(pkg.version)
if (!match) {
  console.error(`Current version "${pkg.version}" is not x.y.z`)
  process.exit(1)
}
let [major, minor, patch] = match.slice(1).map(Number)

let next
if (bump === 'patch') next = `${major}.${minor}.${patch + 1}`
else if (bump === 'minor') next = `${major}.${minor + 1}.0`
else if (bump === 'major') next = `${major + 1}.0.0`
else if (/^\d+\.\d+\.\d+$/.test(bump)) next = bump
else {
  console.error('Usage: npm run desktop:version -- <patch|minor|major|x.y.z>')
  process.exit(1)
}

const toTuple = (v) => v.split('.').map(Number)
const [a, b] = [toTuple(next), toTuple(pkg.version)]
const newer = a[0] - b[0] || a[1] - b[1] || a[2] - b[2]
if (newer <= 0) {
  console.error(`New version ${next} must be greater than ${pkg.version}`)
  process.exit(1)
}

pkg.version = next
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)

console.log(`Desktop version: ${match[0]} -> ${next}\n`)
console.log('Next steps:')
console.log(`  git add electron/package.json`)
console.log(`  git commit -m "Desktop v${next}"`)
console.log(`  git tag v${next}`)
console.log(`  git push origin main --follow-tags`)
