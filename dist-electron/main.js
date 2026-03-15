import { app, BrowserWindow, Menu, MenuItem, shell, nativeImage, Tray } from "electron";
import { join } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
const isDev = process.env.NODE_ENV === "development";
const __dirname$1 = join(fileURLToPath(import.meta.url), "..");
let mainWindow = null;
let tray = null;
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webviewTag: true,
      preload: join(__dirname$1, "../dist-electron/preload.mjs")
    }
  });
  const iconPath = join(app.getAppPath(), "x-suite-icon.png");
  if (fs.existsSync(iconPath)) {
    mainWindow.setIcon(iconPath);
    if (process.platform === "darwin" && app.dock) {
      app.dock.setIcon(iconPath);
    }
  }
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(join(__dirname$1, "../dist/index.html"));
  }
  createTray();
}
function createTray() {
  const iconPath = join(app.getAppPath(), "x-suite-icon.png");
  const trayIcon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 }) : nativeImage.createEmpty();
  tray = new Tray(trayIcon);
  const contextMenu = Menu.buildFromTemplate([
    { label: "Show xsuite", click: () => mainWindow?.show() },
    { type: "separator" },
    { label: "X", click: () => mainWindow?.webContents.send("switch-tab", "x") },
    { label: "Grok", click: () => mainWindow?.webContents.send("switch-tab", "grok") },
    { label: "Console", click: () => mainWindow?.webContents.send("switch-tab", "console") },
    { label: "Grokipedia", click: () => mainWindow?.webContents.send("switch-tab", "grokipedia") },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() }
  ]);
  tray.setToolTip("X Suite");
  tray.setContextMenu(contextMenu);
  tray.on("click", () => mainWindow?.show());
}
function createApplicationMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...isMac ? [{
      label: app.name,
      submenu: [
        { role: "about" },
        { type: "separator" },
        { role: "services" },
        { type: "separator" },
        { role: "hide" },
        { role: "hideOthers" },
        { role: "unhide" },
        { type: "separator" },
        { role: "quit" }
      ]
    }] : [],
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "pasteAndMatchStyle" },
        { role: "delete" },
        { role: "selectAll" }
      ]
    },
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" }
      ]
    }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
app.whenReady().then(() => {
  createApplicationMenu();
  createWindow();
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
app.on("web-contents-created", (_, contents) => {
  contents.on("context-menu", (_2, params) => {
    const menu = new Menu();
    if (params.hasImageContents) {
      menu.append(new MenuItem({
        label: "Copy Image",
        click: () => contents.copyImageAt(params.x, params.y)
      }));
    }
    if (params.selectionText) {
      menu.append(new MenuItem({ label: "Copy Text", role: "copy" }));
    }
    if (params.isEditable) {
      menu.append(new MenuItem({ label: "Paste", role: "paste" }));
    }
    if (menu.items.length > 0) {
      menu.popup();
    }
  });
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });
  contents.on("will-navigate", (event, url) => {
    if (contents.getType() === "window" && !url.startsWith("http://localhost") && !url.startsWith("file://")) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
  contents.on("did-finish-load", () => {
    contents.insertCSS(`
      ::-webkit-scrollbar { display: none !important; }
      * { scrollbar-width: none !important; -ms-overflow-style: none !important; }
    `);
  });
});
