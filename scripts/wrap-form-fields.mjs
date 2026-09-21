import fs from 'node:fs'
import path from 'node:path'

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, out)
    else if (/\.tsx$/.test(ent.name)) out.push(p)
  }
  return out
}

const roots = ['src/views', 'src/components']
const files = roots.flatMap((r) => walk(path.join(process.cwd(), r)))
let changedFiles = 0

for (const file of files) {
  let src = fs.readFileSync(file, 'utf8')
  const original = src

  const openRe = /<div(\s+className="([^"]*\bspace-y-2\b[^"]*)")(\s*>)/g
  let match
  const replacements = []
  while ((match = openRe.exec(src)) !== null) {
    const start = match.index
    const fullOpen = match[0]
    const className = match[2]
    let i = start + fullOpen.length
    let depth = 1
    while (i < src.length && depth > 0) {
      const nextOpen = src.indexOf('<div', i)
      const nextClose = src.indexOf('</div>', i)
      if (nextClose === -1) {
        depth = -1
        break
      }
      if (nextOpen !== -1 && nextOpen < nextClose) {
        depth++
        i = nextOpen + 4
      } else {
        depth--
        if (depth === 0) {
          const inner = src.slice(start + fullOpen.length, nextClose)
          const hasLabel = /<Label[\s>]/.test(inner)
          const hasControl = /<(Input|Select|Textarea|Switch|Checkbox)[\s>]/.test(inner)
          const labelCount = (inner.match(/<Label[\s>]/g) || []).length
          if (
            hasLabel &&
            hasControl &&
            labelCount <= 2 &&
            !inner.includes('grid gap') &&
            inner.length < 1200
          ) {
            const otherClasses = className
              .split(/\s+/)
              .filter((c) => c && c !== 'space-y-2')
              .join(' ')
            const open = otherClasses ? `<Field className="${otherClasses}">` : '<Field>'
            replacements.push({ start, end: nextClose + 6, open, close: '</Field>', inner })
          }
          i = nextClose + 6
        } else {
          i = nextClose + 6
        }
      }
    }
  }

  if (!replacements.length) continue

  replacements.sort((a, b) => b.start - a.start)
  for (const r of replacements) {
    src = src.slice(0, r.start) + r.open + r.inner + r.close + src.slice(r.end)
  }

  if (src === original) continue

  if (!src.includes("from '@/components/ui/field'")) {
    if (src.includes("from '@/components/ui/label'")) {
      src = src.replace(
        "from '@/components/ui/label'",
        "from '@/components/ui/label'\nimport { Field } from '@/components/ui/field'",
      )
    } else if (src.includes("from '@/components/ui/input'")) {
      src = src.replace(
        "from '@/components/ui/input'",
        "from '@/components/ui/input'\nimport { Field } from '@/components/ui/field'",
      )
    } else {
      src = `import { Field } from '@/components/ui/field'\n` + src
    }
  }

  fs.writeFileSync(file, src)
  changedFiles++
  console.log('updated', path.relative(process.cwd(), file), 'fields=', replacements.length)
}

console.log('done files=', changedFiles)
