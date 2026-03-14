import { app, BrowserWindow, Tray, Menu, nativeImage } from 'electron'
import { join } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const isDev = process.env.NODE_ENV === 'development'

const __dirname = join(fileURLToPath(import.meta.url), '..')
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    titleBarStyle: 'hiddenInset',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      preload: join(__dirname, '../dist-electron/preload.mjs')
    }
  })

  // Use app directory so icon is found when installed from DMG (process.cwd() is not the app)
  const iconPath = join(app.getAppPath(), 'x-suite-icon.png')
  if (fs.existsSync(iconPath)) {
    mainWindow.setIcon(iconPath)
    if (process.platform === 'darwin' && app.dock) {
      app.dock.setIcon(iconPath)
    }
  }

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')   // Vite dev server
  } else {
    // Vite outputs renderer to dist/, so load from there when packaged
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  createTray()
}

function createTray() {
  const iconPath = join(app.getAppPath(), 'x-suite-icon.png')
  const trayIcon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath).resize({width: 16, height: 16})
    : nativeImage.createEmpty()

  tray = new Tray(trayIcon)

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show xsuite', click: () => mainWindow?.show() },
    { type: 'separator' },
    { label: 'X', click: () => mainWindow?.webContents.send('switch-tab', 'x') },
    { label: 'Grok', click: () => mainWindow?.webContents.send('switch-tab', 'grok') },
    { label: 'Console', click: () => mainWindow?.webContents.send('switch-tab', 'console') },
    { label: 'Grokipedia', click: () => mainWindow?.webContents.send('switch-tab', 'grokipedia') },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ])

  tray.setToolTip("X Suite")
  tray.setContextMenu(contextMenu)

  tray.on('click', () => mainWindow?.show())
}
app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})