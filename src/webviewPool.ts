/**
 * Reuses one <webview> DOM node per tab id. FlexLayout workspace swaps would otherwise
 * unmount React trees and recreate webviews, reloading each page.
 */

const pool = new Map<string, Electron.WebviewTag>()

function getOrCreatePoolRoot(): HTMLDivElement {
  let r = document.getElementById('xsuite-webview-pool') as HTMLDivElement | null
  if (!r) {
    r = document.createElement('div')
    r.id = 'xsuite-webview-pool'
    r.setAttribute('aria-hidden', 'true')
    r.style.cssText =
      'position:fixed;left:-9999px;top:0;width:4px;height:4px;overflow:hidden;visibility:hidden;pointer-events:none;'
    document.body.appendChild(r)
  }
  return r
}

/**
 * Mounts the pooled webview into `container`. On cleanup, moves it to an off-screen
 * holder (does not destroy the guest), preserving navigation and scroll state.
 */
export function dockWebview(
  tabId: string,
  url: string,
  partition: string,
  container: HTMLElement
): () => void {
  let wv = pool.get(tabId)
  if (!wv) {
    wv = document.createElement('webview') as Electron.WebviewTag
    wv.src = url
    wv.partition = partition
    wv.setAttribute('allowpopups', '')
    wv.style.cssText = 'width:100%;height:100%;border:0;background:#000;display:flex'
    pool.set(tabId, wv)
  }
  container.appendChild(wv)
  return () => {
    getOrCreatePoolRoot().appendChild(wv)
  }
}
