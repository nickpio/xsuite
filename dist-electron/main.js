import { app as t, BrowserWindow as l, nativeImage as s, Tray as w, Menu as h } from "electron";
import { join as n } from "path";
import { fileURLToPath as m } from "url";
import c from "fs";
const u = process.env.NODE_ENV === "development", a = n(m(import.meta.url), "..");
let e = null, i = null;
function r() {
  e = new l({
    width: 1400,
    height: 900,
    titleBarStyle: "hiddenInset",
    webPreferences: {
      nodeIntegration: !1,
      contextIsolation: !0,
      webviewTag: !0,
      preload: n(a, "../dist-electron/preload.mjs")
    }
  });
  const o = n(t.getAppPath(), "x-suite-icon.png");
  c.existsSync(o) && (e.setIcon(o), process.platform === "darwin" && t.dock && t.dock.setIcon(o)), u ? e.loadURL("http://localhost:5173") : e.loadFile(n(a, "../dist/index.html")), b();
}
function b() {
  const o = n(t.getAppPath(), "x-suite-icon.png"), d = c.existsSync(o) ? s.createFromPath(o).resize({ width: 16, height: 16 }) : s.createEmpty();
  i = new w(d);
  const p = h.buildFromTemplate([
    { label: "Show xsuite", click: () => e?.show() },
    { type: "separator" },
    { label: "X", click: () => e?.webContents.send("switch-tab", "x") },
    { label: "Grok", click: () => e?.webContents.send("switch-tab", "grok") },
    { label: "Console", click: () => e?.webContents.send("switch-tab", "console") },
    { label: "Grokipedia", click: () => e?.webContents.send("switch-tab", "grokipedia") },
    { type: "separator" },
    { label: "Quit", click: () => t.quit() }
  ]);
  i.setToolTip("X Suite"), i.setContextMenu(p), i.on("click", () => e?.show());
}
t.whenReady().then(r);
t.on("window-all-closed", () => {
  process.platform !== "darwin" && t.quit();
});
t.on("activate", () => {
  l.getAllWindows().length === 0 && r();
});
