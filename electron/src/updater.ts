import { app, dialog, type BrowserWindow, type MessageBoxOptions } from 'electron'
import { autoUpdater } from 'electron-updater'
import { APP_TITLE } from './config'
import { log } from './logger'

const FIRST_CHECK_DELAY_MS = 8_000
const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000

let getWindow: () => BrowserWindow | null = () => null
let manualCheck = false
let downloading = false
let downloadedVersion: string | null = null

function showMessage(options: MessageBoxOptions) {
  const win = getWindow()
  return win ? dialog.showMessageBox(win, options) : dialog.showMessageBox(options)
}

function setProgress(value: number) {
  getWindow()?.setProgressBar(value)
}

async function promptRestart(version: string) {
  const { response } = await showMessage({
    type: 'info',
    title: 'Update Ready',
    message: 'Update Ready',
    detail: `Viste SMS ${version} has been downloaded.\n\nRestart Viste SMS to complete the update.`,
    buttons: ['Restart && Update', 'Later'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  })
  if (response === 0) {
    log(`Restarting to install ${version}`)
    setImmediate(() => autoUpdater.quitAndInstall(true, true))
  }
}

function check() {
  autoUpdater.checkForUpdates().catch((err: unknown) => {
    log(`Update check failed: ${err instanceof Error ? err.message : String(err)}`, 'warn')
  })
}

/**
 * GitHub Releases auto-update (electron-updater). Downloads are verified against the
 * sha512 in the release's latest.yml; the running version keeps working until the
 * user restarts, and an interrupted download never replaces the installed app.
 */
export function initAutoUpdates(windowGetter: () => BrowserWindow | null) {
  getWindow = windowGetter
  if (!app.isPackaged) {
    log('Auto-update disabled in development builds')
    return
  }

  autoUpdater.logger = {
    info: (m: unknown) => log(`[updater] ${String(m)}`),
    warn: (m: unknown) => log(`[updater] ${String(m)}`, 'warn'),
    error: (m: unknown) => log(`[updater] ${String(m)}`, 'error'),
    debug: () => undefined,
  }
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.allowPrerelease = false
  autoUpdater.allowDowngrade = false
  autoUpdater.disableWebInstaller = true

  autoUpdater.on('update-available', (info) => {
    downloading = true
    log(`Update available: ${info.version}`)
    void showMessage({
      type: 'info',
      title: 'Viste SMS Update Available',
      message: 'Viste SMS Update Available',
      detail: `A new version of Viste SMS is available.\n\nCurrent version: ${app.getVersion()}\nNew version: ${info.version}\n\nDownloading update…`,
      buttons: ['OK'],
      noLink: true,
    })
  })

  autoUpdater.on('update-not-available', () => {
    if (manualCheck) {
      void showMessage({
        type: 'info',
        title: APP_TITLE,
        message: 'You’re up to date',
        detail: `Viste SMS ${app.getVersion()} is the latest version.`,
        buttons: ['OK'],
      })
    }
    manualCheck = false
  })

  autoUpdater.on('download-progress', (p) => setProgress(Math.max(0, Math.min(1, p.percent / 100))))

  autoUpdater.on('update-downloaded', (info) => {
    downloading = false
    manualCheck = false
    downloadedVersion = info.version
    setProgress(-1)
    log(`Update downloaded: ${info.version}`)
    void promptRestart(info.version)
  })

  autoUpdater.on('error', (err) => {
    downloading = false
    setProgress(-1)
    log(`Updater error: ${err?.message ?? String(err)}`, 'error')
    if (manualCheck) {
      void showMessage({
        type: 'warning',
        title: APP_TITLE,
        message: 'Could not check for updates',
        detail: 'Please check your internet connection and try again later.',
        buttons: ['OK'],
      })
    }
    manualCheck = false
  })

  setTimeout(check, FIRST_CHECK_DELAY_MS)
  setInterval(check, CHECK_INTERVAL_MS)
}

export function checkForUpdatesManually() {
  if (!app.isPackaged) {
    void showMessage({
      type: 'info',
      title: APP_TITLE,
      message: 'Updates are only available in the installed app.',
      buttons: ['OK'],
    })
    return
  }
  if (downloadedVersion) {
    void promptRestart(downloadedVersion)
    return
  }
  if (downloading) {
    void showMessage({
      type: 'info',
      title: APP_TITLE,
      message: 'An update is already downloading.',
      detail: 'You will be asked to restart when it is ready.',
      buttons: ['OK'],
    })
    return
  }
  manualCheck = true
  check()
}
