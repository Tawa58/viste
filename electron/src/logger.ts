import { app } from 'electron'
import fs from 'node:fs'
import path from 'node:path'

const MAX_BYTES = 1_000_000

function logFile(): string {
  return path.join(app.getPath('logs'), 'main.log')
}

/** Small append-only log in %APPDATA%\Viste SMS\logs\main.log for support diagnostics. */
export function log(message: string, level: 'info' | 'warn' | 'error' = 'info') {
  const line = `${new Date().toISOString()} [${level}] ${message}\n`
  if (!app.isPackaged) process.stdout.write(line)
  try {
    const file = logFile()
    fs.mkdirSync(path.dirname(file), { recursive: true })
    if (fs.existsSync(file) && fs.statSync(file).size > MAX_BYTES) {
      fs.renameSync(file, `${file}.old`)
    }
    fs.appendFileSync(file, line)
  } catch {
    /* logging must never crash the app */
  }
}
