import { Webview } from '@tauri-apps/api/webview'
import { invoke } from '@tauri-apps/api/core'
import { PhysicalPosition, PhysicalSize } from '@tauri-apps/api/dpi'

/**
 * Reuses one Tauri Webview instance per tab id.
 * Syncs the native webview position to a placeholder DOM node.
 *
 * Webviews are created on the Rust side via `create_webview` command
 * so that `initialization_script` can be attached for persistent
 * CSS injection (scrollbar hiding) across page navigations.
 */

const pool = new Map<string, Webview>()
const observers = new Map<string, ResizeObserver>()
const readyWebviews = new Set<string>()
const unmountTimers = new Map<string, number>()
const pendingCreation = new Set<string>()

function labelFor(tabId: string) {
  return `wv-${tabId.replace(/[^a-zA-Z0-9_-]/g, '')}`
}

/**
 * Bounds a Tauri native webview to a specific DOM element.
 * Creates the Webview via Rust if it doesn't exist.
 */
export function dockWebview(
  tabId: string,
  url: string,
  _partition: string,
  container: HTMLElement
): () => void {
  // Cancel any pending teardown from a previous unmount
  if (unmountTimers.has(tabId)) {
    window.clearTimeout(unmountTimers.get(tabId))
    unmountTimers.delete(tabId)
  }

  const label = labelFor(tabId)
  let wv = pool.get(tabId)

  const syncRect = async () => {
    const currentWv = pool.get(tabId)
    if (!currentWv || !readyWebviews.has(tabId)) return
    const rect = container.getBoundingClientRect()
    try {
      const dpr = window.devicePixelRatio
      await currentWv.setPosition(new PhysicalPosition(Math.round(rect.left * dpr), Math.round(rect.top * dpr)))
      await currentWv.setSize(new PhysicalSize(Math.round(rect.width * dpr), Math.round(rect.height * dpr)))
    } catch (err: any) {
      console.error('syncRect error', tabId, err)
    }
  }

  if (!wv && !pendingCreation.has(tabId)) {
    pendingCreation.add(tabId)

    // Create via Rust so initialization_script is attached
    invoke('create_webview', { label, url })
      .then(async () => {
        // Grab a JS handle to the webview Rust just created
        const webview = await Webview.getByLabel(label)
        if (!webview) {
          console.error('create_webview succeeded but getByLabel returned null for', label)
          pendingCreation.delete(tabId)
          return
        }

        pool.set(tabId, webview)
        readyWebviews.add(tabId)
        pendingCreation.delete(tabId)

        await syncRect()
        webview.show().catch(console.error)
      })
      .catch(async (e: any) => {
        // If the webview already exists (e.g. HMR reload), grab the existing handle
        console.warn('create_webview error (may already exist):', e)
        try {
          const webview = await Webview.getByLabel(label)
          if (webview) {
            pool.set(tabId, webview)
            readyWebviews.add(tabId)
            await syncRect()
            webview.show().catch(console.error)
          }
        } catch (fallbackErr) {
          console.error('Failed to recover webview handle', fallbackErr)
        }
        pendingCreation.delete(tabId)
      })
  } else if (wv) {
    if (readyWebviews.has(tabId)) {
      wv.show().catch(console.error)
    }
  }

  // Sync initially
  syncRect()

  let observer = observers.get(tabId)
  if (observer) {
    observer.disconnect()
  }

  observer = new ResizeObserver(() => {
    syncRect()
  })

  observer.observe(container)
  observers.set(tabId, observer)

  return () => {
    observer?.disconnect()

    if (observers.get(tabId) === observer) {
      observers.delete(tabId)

      const timerId = window.setTimeout(() => {
        unmountTimers.delete(tabId)
        const currentWv = pool.get(tabId)
        if (currentWv && readyWebviews.has(tabId)) {
          currentWv.hide().catch(console.error)
        }
      }, 150)

      unmountTimers.set(tabId, timerId)
    }
  }
}
