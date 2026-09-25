import { contextBridge, ipcRenderer } from 'electron'

/**
 * Minimal, read-only bridge. The web app works unchanged without it; it only lets
 * pages detect the desktop shell (e.g. for future offline or printer features).
 * Never expose Node, filesystem, or raw ipcRenderer here.
 */
contextBridge.exposeInMainWorld('visteDesktop', {
  isDesktop: true,
  platform: process.platform,
  getVersion: (): Promise<string> => ipcRenderer.invoke('viste:get-version'),
})
