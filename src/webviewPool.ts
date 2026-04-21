import { Webview } from '@tauri-apps/api/webview'
import { invoke } from '@tauri-apps/api/core'
import { PhysicalPosition, PhysicalSize } from '@tauri-apps/api/dpi'

const pool = new Map<string, Webview>()
const readyWebviews = new Set<string>()
const pendingCreation = new Set<string>()

function labelFor(tabId: string) {
  return `wv-${tabId.replace(/[^a-zA-Z0-9_-]/g, '')}`
}

export function getWebview(tabId: string): Webview | undefined {
  return pool.get(tabId)
}

export function showWebview(tabId: string) {
  const wv = pool.get(tabId)
  if (wv && readyWebviews.has(tabId)) {
    wv.show().catch(console.error)
  }
}

export function hideWebview(tabId: string) {
  const wv = pool.get(tabId)
  if (wv && readyWebviews.has(tabId)) {
    wv.hide().catch(console.error)
  }
}

/**
 * Synchronizes a native webview to a DOM element's position and size.
 */
export async function syncRect(tabId: string, container: HTMLElement) {
  const wv = pool.get(tabId)
  if (!wv || !readyWebviews.has(tabId)) return

  const rect = container.getBoundingClientRect()
  if (rect.width < 1 || rect.height < 1) return

  try {
    const dpr = window.devicePixelRatio
    // Use PhysicalPosition/Size to be explicit
    await wv.setPosition(new PhysicalPosition(Math.round(rect.left * dpr), Math.round(rect.top * dpr)))
    await wv.setSize(new PhysicalSize(Math.round(rect.width * dpr), Math.round(rect.height * dpr)))
  } catch (err) {
    // Ignore errors during transition/destruction
  }
}

export function dockWebview(
  tabId: string,
  url: string,
  container: HTMLElement
): () => void {
  const label = labelFor(tabId)
  
  const init = async () => {
    if (pool.has(tabId) || pendingCreation.has(tabId)) return
    
    pendingCreation.add(tabId)
    try {
      await invoke('create_webview', { label, url })
      const webview = await Webview.getByLabel(label)
      if (webview) {
        pool.set(tabId, webview)
        readyWebviews.add(tabId)
        await syncRect(tabId, container)
      }
    } catch (e) {
      const webview = await Webview.getByLabel(label)
      if (webview) {
        pool.set(tabId, webview)
        readyWebviews.add(tabId)
        await syncRect(tabId, container)
      }
    } finally {
      pendingCreation.delete(tabId)
    }
  }

  init()

  // Use a loop to keep it synced during transitions
  let active = true
  const loop = () => {
    if (!active) return
    syncRect(tabId, container)
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)

  return () => {
    active = false
    const wv = pool.get(tabId)
    if (wv) wv.hide().catch(console.error)
  }
}
