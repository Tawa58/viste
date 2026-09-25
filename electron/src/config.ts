import { app } from 'electron'

/** The deployed Viste SMS web app — the desktop shell renders this exact app. */
export const PRODUCTION_APP_URL = 'https://viste-sms.vercel.app'

export const APP_TITLE = 'Viste SMS'
export const APP_USER_MODEL_ID = 'school.viste.sms'

/**
 * URL the window loads. Development builds may point at a local `next dev`
 * server via `--app-url=` or VISTE_APP_URL; installed builds always use production.
 */
export function resolveAppUrl(): URL {
  if (!app.isPackaged) {
    const arg = process.argv.find((a) => a.startsWith('--app-url='))
    const override = arg?.slice('--app-url='.length) || process.env.VISTE_APP_URL
    if (override) {
      try {
        const url = new URL(override)
        if (url.protocol === 'http:' || url.protocol === 'https:') return url
      } catch {
        /* fall through to production */
      }
    }
  }
  return new URL(PRODUCTION_APP_URL)
}
