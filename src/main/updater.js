// Source distributions do not select a binary update service for the user.
import { BrowserWindow } from 'electron'

function reportUnavailable() {
  for (const window of BrowserWindow.getAllWindows()) {
    window.webContents.send('update-check-status', {
      status: 'error',
      message: 'Automatic binary updates are disabled in this source build. Build updates from the project source.'
    })
  }
}

export function checkForUpdatesOnStartup() {}
export function setupAutoUpdater() {}
export function stopUpdateCheck() {}
export function checkForUpdates(isManual = false) {
  if (isManual) reportUnavailable()
}
export function installUpdateNow() { reportUnavailable() }
export function enableMockUpdate() {}
export function simulateMockUpdateDownload() {}
export function mockInstallUpdate() {}
