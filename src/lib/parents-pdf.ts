import type { Guardian, Student } from '@/types'
import { educationLevelName } from '@/lib/education-levels'
import { fullName } from '@/lib/utils'

export type ParentPdfVariant =
  | 'contacts'
  | 'names_address'
  | 'names_contacts'
  | 'names_contacts_children'

export type ParentPdfRow = {
  guardian: Guardian
  children: Student[]
  /** Resolved class / level labels keyed by student id */
  levelByStudentId: Record<string, string>
}

const VARIANT_TITLES: Record<ParentPdfVariant, string> = {
  contacts: 'Parent / guardian contacts',
  names_address: 'Parent / guardian names and addresses',
  names_contacts: 'Parent / guardian names and contacts',
  names_contacts_children: 'Parents with contacts, children, and levels',
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function childLine(s: Student, levelByStudentId: Record<string, string>) {
  const level =
    levelByStudentId[s.id] ||
    educationLevelName(s.educationLevelId) ||
    '—'
  return `${fullName(s)} (${level})`
}

/** Opens a print-ready parent list (browser → Save as PDF). */
export function downloadParentsPdf(opts: {
  schoolName?: string
  variant: ParentPdfVariant
  rows: ParentPdfRow[]
}) {
  const school = opts.schoolName ?? 'Viste High School'
  const title = VARIANT_TITLES[opts.variant]
  const date = new Date().toISOString().slice(0, 10)

  const headers: string[] = (() => {
    switch (opts.variant) {
      case 'contacts':
        return ['#', 'Name', 'Phone', 'Email']
      case 'names_address':
        return ['#', 'Name', 'Address']
      case 'names_contacts':
        return ['#', 'Name', 'Phone', 'Email']
      case 'names_contacts_children':
        return ['#', 'Name', 'Phone', 'Email', 'Children & levels']
    }
  })()

  const bodyRows = opts.rows
    .map((row, i) => {
      const name = `${row.guardian.firstName} ${row.guardian.lastName}`.trim()
      const phone = row.guardian.phone || '—'
      const email = row.guardian.email || '—'
      const address = row.guardian.address || '—'
      const children =
        row.children.length > 0
          ? row.children.map((s) => childLine(s, row.levelByStudentId)).join('; ')
          : '—'

      switch (opts.variant) {
        case 'contacts':
          return `<tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(name)}</td>
            <td>${escapeHtml(phone)}</td>
            <td>${escapeHtml(email)}</td>
          </tr>`
        case 'names_address':
          return `<tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(name)}</td>
            <td>${escapeHtml(address)}</td>
          </tr>`
        case 'names_contacts':
          return `<tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(name)}</td>
            <td>${escapeHtml(phone)}</td>
            <td>${escapeHtml(email)}</td>
          </tr>`
        case 'names_contacts_children':
          return `<tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(name)}</td>
            <td>${escapeHtml(phone)}</td>
            <td>${escapeHtml(email)}</td>
            <td>${escapeHtml(children)}</td>
          </tr>`
      }
    })
    .join('')

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} — ${escapeHtml(date)}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; color: #111; margin: 24px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    h2 { font-size: 15px; font-weight: normal; margin: 0 0 16px; color: #444; }
    .meta { font-size: 12px; margin-bottom: 16px; line-height: 1.5; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f3f3f3; }
    @media print {
      body { margin: 12mm; }
      button { display: none !important; }
    }
  </style>
</head>
<body>
  <button onclick="window.print()" style="margin-bottom:12px;padding:8px 12px;">Print / Save as PDF</button>
  <h1>${escapeHtml(school)}</h1>
  <h2>${escapeHtml(title)}</h2>
  <div class="meta">
    <div><strong>Generated:</strong> ${escapeHtml(date)}</div>
    <div><strong>Records:</strong> ${opts.rows.length}</div>
  </div>
  <table>
    <thead>
      <tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`

  const win = window.open('', '_blank', 'noopener,noreferrer,width=960,height=720')
  if (!win) {
    throw new Error('Pop-up blocked — allow pop-ups to download the PDF')
  }
  win.document.open()
  win.document.write(html)
  win.document.close()
}
