import { app, BrowserWindow, Tray, Menu, nativeImage, shell, MenuItem, ipcMain } from 'electron'
import { join } from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
// @ts-ignore — electron-store is CommonJS
import Store from 'electron-store'

interface Workspace {
  name: string
  layout: any
  isPreset?: boolean
}

const store = new Store<{ workspaces: Workspace[] }>({
  defaults: { workspaces: [] }
})

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
function createApplicationMenu() {
  const isMac = process.platform === 'darwin'
  const template: any[] = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }] : []),
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'pasteAndMatchStyle' },
        { role: 'delete' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

app.whenReady().then(() => {
  // Workspace IPC handlers
  ipcMain.handle('load-workspaces', () => {
    return store.get('workspaces', [])
  })

  ipcMain.handle('save-workspace', (_event, workspace: Workspace) => {
    const workspaces: Workspace[] = store.get('workspaces', [])
    const idx = workspaces.findIndex(w => w.name === workspace.name)
    if (idx >= 0) {
      workspaces[idx] = workspace
    } else {
      workspaces.push(workspace)
    }
    store.set('workspaces', workspaces)
    return workspaces
  })

  ipcMain.handle('delete-workspace', (_event, name: string) => {
    const workspaces: Workspace[] = store.get('workspaces', [])
    const filtered = workspaces.filter(w => w.name !== name)
    store.set('workspaces', filtered)
    return filtered
  })

  createApplicationMenu()
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on('web-contents-created', (_, contents) => {
  // Context menu for copy/paste
  contents.on('context-menu', (_, params) => {
    const menu = new Menu()
    if (params.hasImageContents) {
      menu.append(new MenuItem({ 
        label: 'Copy Image', 
        click: () => contents.copyImageAt(params.x, params.y)
      }))
    }
    if (params.selectionText) {
      menu.append(new MenuItem({ label: 'Copy Text', role: 'copy' }))
    }
    if (params.isEditable) {
      menu.append(new MenuItem({ label: 'Paste', role: 'paste' }))
    }
    
    if (menu.items.length > 0) {
      menu.popup()
    }
  })

  // Handle external links for window.open (target="_blank")
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })
  
  // Intercept navigation in the main window for external links
  contents.on('will-navigate', (event, url) => {
    if (contents.getType() === 'window' && !url.startsWith('http://localhost') && !url.startsWith('file://')) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  // Inject CSS to hide scrollbars into every web page / webview content
  contents.on('did-finish-load', () => {
    contents.insertCSS(`
      ::-webkit-scrollbar { display: none !important; }
      * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
    `)
  })
})