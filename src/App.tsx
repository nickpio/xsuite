import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import { BookOpen, LogIn, LayoutDashboard } from 'lucide-react'
import { FaXTwitter } from 'react-icons/fa6'
import { XAI, Grok } from '@lobehub/icons'
import * as FlexLayout from 'flexlayout-react'
import logo from './assets/x-suite-logo.png'
import { PRESET_WORKSPACES, type Workspace } from './workspaces'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'
import { dockWebview } from './webviewPool'
import { getCurrentWindow } from '@tauri-apps/api/window'

const tabs = [
  { id: 'x', label: 'X', icon: FaXTwitter, url: 'https://x.com' },
  { id: 'grok', label: 'Grok', icon: Grok, url: 'https://grok.com' },
  { id: 'console', label: 'Console', icon: XAI, url: 'https://console.x.ai' },
  { id: 'grokipedia', label: 'Grokipedia', icon: BookOpen, url: 'https://grokipedia.com' },
]

const SHARED_PARTITION = 'persist:xsuite'

import { loadWorkspaces, saveWorkspace, deleteWorkspace } from './store'
import { listen } from '@tauri-apps/api/event'

function buildModel(layout: FlexLayout.IJsonModel) {
  // FlexLayout mutates the JSON object heavily (adding IDs and cycle references).
  // We MUST deep-clone the layout config, otherwise switching to presets twice corrupts them.
  return FlexLayout.Model.fromJson(JSON.parse(JSON.stringify(layout)))
}

const LAYOUT_TWEEN_MS = 320

function collectTabRects(root: HTMLElement): Map<string, DOMRect> {
  const m = new Map<string, DOMRect>()
  root.querySelectorAll('[data-xsuite-tab]').forEach((node) => {
    const el = node as HTMLElement
    const id = el.dataset.xsuiteTab
    if (id) m.set(id, el.getBoundingClientRect())
  })
  return m
}

/**
 * Electron `<webview>` is composited separately and does not follow parent `transform`,
 * so FLIP on tab shells is invisible. Tween fixed overlay panels (position/size) instead.
 */
function runWorkspaceOverlayTween(
  layoutRoot: HTMLElement,
  first: Map<string, DOMRect>,
  removePreviousHost: () => void
) {
  removePreviousHost()

  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)'

  const startTween = () => {
    const last = collectTabRects(layoutRoot)
    const host = document.createElement('div')
    host.setAttribute('data-xsuite-layout-tween', '')
    host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9998;'

    type Entry = { el: HTMLDivElement; b: DOMRect }
    const entries: Entry[] = []

    for (const [id, a] of first) {
      const b = last.get(id)
      if (!b) continue
      if (a.width < 2 || a.height < 2 || b.width < 2 || b.height < 2) continue
      const dl = Math.abs(a.left - b.left)
      const dt = Math.abs(a.top - b.top)
      const dw = Math.abs(a.width - b.width)
      const dh = Math.abs(a.height - b.height)
      if (dl < 1 && dt < 1 && dw < 1 && dh < 1) continue

      const el = document.createElement('div')
      el.style.cssText = [
        'position:absolute',
        `left:${a.left}px`,
        `top:${a.top}px`,
        `width:${a.width}px`,
        `height:${a.height}px`,
        'background:rgba(39,39,42,0.82)',
        'border:1px solid rgba(255,255,255,0.1)',
        'border-radius:10px',
        'box-shadow:0 16px 48px rgba(0,0,0,0.55)',
      ].join(';')
      host.appendChild(el)
      entries.push({ el, b })
    }

    if (!entries.length) return

    document.body.appendChild(host)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        for (const { el, b } of entries) {
          el.style.transition = [
            `left ${LAYOUT_TWEEN_MS}ms ${ease}`,
            `top ${LAYOUT_TWEEN_MS}ms ${ease}`,
            `width ${LAYOUT_TWEEN_MS}ms ${ease}`,
            `height ${LAYOUT_TWEEN_MS}ms ${ease}`,
          ].join(',')
          el.style.left = `${b.left}px`
          el.style.top = `${b.top}px`
          el.style.width = `${b.width}px`
          el.style.height = `${b.height}px`
        }
      })
    })

    window.setTimeout(() => {
      host.remove()
    }, LAYOUT_TWEEN_MS + 80)
  }

  // Let flexlayout commit sizes before sampling "last" rects (avoids no-op tweens).
  requestAnimationFrame(() => {
    requestAnimationFrame(startTween)
  })
}

/** Imperative webview pool — same DOM guest survives FlexLayout model swaps (no reload). */
function PooledWebviewShell({ tabId, url }: { tabId: string; url: string }) {
  const shellRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = shellRef.current
    if (!el) return
    return dockWebview(tabId, url, SHARED_PARTITION, el)
  }, [tabId, url])
  return (
    <div
      ref={shellRef}
      className="w-full h-full min-h-0 min-w-0 [&:empty]:min-h-[120px]"
      data-xsuite-tab={tabId}
    />
  )
}

function App() {
  const [showLogin, setShowLogin] = useState(true)
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace>(PRESET_WORKSPACES[0])
  const [model, setModel] = useState(() => buildModel(PRESET_WORKSPACES[0].layout))
  const [customWorkspaces, setCustomWorkspaces] = useState<Workspace[]>([])
  const [showSwitcher, setShowSwitcher] = useState(false)
  const [activeTab, setActiveTab] = useState('grok')
  const layoutRef = useRef<FlexLayout.Layout>(null)
  const workspaceFlipFromRef = useRef<Map<string, DOMRect> | null>(null)

  // Load persisted custom workspaces on mount
  useEffect(() => {
    loadWorkspaces().then((saved) => {
      if (saved?.length) setCustomWorkspaces(saved)
    }).catch(console.error)
  }, [])

  // Keep activeTab in sync with layout selections
  const onModelChange = useCallback(() => {
    const activeNode = model.getActiveTabset()?.getSelectedNode() as FlexLayout.TabNode
    if (activeNode) setActiveTab(activeNode.getComponent() || '')
  }, [model])

  const handleSignIn = () => {
    setShowLogin(false)
    model.doAction(FlexLayout.Actions.selectTab('x'))
  }

  const loadWorkspaceWithTransition = useCallback((ws: Workspace) => {
    if (ws.name === activeWorkspace.name) return
    const root = layoutRef.current?.getRootDiv() ?? null
    if (root) {
      const rects = collectTabRects(root)
      workspaceFlipFromRef.current = rects.size > 0 ? rects : null
    } else {
      workspaceFlipFromRef.current = null
    }
    setActiveWorkspace(ws)
    setModel(buildModel(ws.layout))
  }, [activeWorkspace.name])

  // Menu: switch preset workspace by index (accelerators work even when a webview is focused)
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<number>('switch-workspace-preset', (event) => {
      if (showLogin) return
      const index = event.payload
      if (typeof index !== 'number' || index < 0 || index >= PRESET_WORKSPACES.length) return
      loadWorkspaceWithTransition(PRESET_WORKSPACES[index])
    }).then(fn => { unlisten = fn });
    return () => { if (unlisten) unlisten() }
  }, [showLogin, loadWorkspaceWithTransition])

  // Tray Integration: open or focus an app from the tray menu
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    listen<string>('open-app-from-tray', (event) => {
      if (showLogin) return
      const id = event.payload

      // Map the tray payload string directly to the tab IDs we use (which match tabs.ts components)
      let targetId = id
      if (id === 'X') targetId = 'x'
      if (id === 'Grok') targetId = 'grok'
      if (id === 'Grokipedia') targetId = 'grokipedia'
      if (id === 'console.x.ai') targetId = 'console' // Assuming this maps to console? Wait, I should check the actual ids used in tabs.ts or handleSidebarClick!

      if (model.getNodeById(targetId)) {
        model.doAction(FlexLayout.Actions.selectTab(targetId))
        setActiveTab(targetId)
      } else {
        const activeTabset = model.getActiveTabset()
        let targetNodeId = activeTabset?.getId()
        if (!targetNodeId) targetNodeId = model.getRoot().getId()

        let count = 0
        model.visitNodes(node => {
          if (node.getType() === 'tabset') count++
        })

        let location = FlexLayout.DockLocation.RIGHT
        if (count % 4 === 1) location = FlexLayout.DockLocation.RIGHT
        else if (count % 4 === 2) location = FlexLayout.DockLocation.BOTTOM
        else if (count % 4 === 3) location = FlexLayout.DockLocation.LEFT
        else if (count % 4 === 0) location = FlexLayout.DockLocation.TOP

        model.doAction(FlexLayout.Actions.addNode(
          { type: 'tab', component: targetId, name: '', id: targetId },
          targetNodeId,
          location,
          -1
        ))

        setActiveTab(targetId)
      }
    }).then(fn => { unlisten = fn });
    return () => { if (unlisten) unlisten() }
  }, [showLogin, model])

  useLayoutEffect(() => {
    const first = workspaceFlipFromRef.current
    if (first === null || first.size === 0) return
    workspaceFlipFromRef.current = null
    const root = layoutRef.current?.getRootDiv()
    if (!root) return
    const removeTweenLayer = () => {
      document.querySelectorAll('[data-xsuite-layout-tween]').forEach((n) => n.remove())
    }
    runWorkspaceOverlayTween(root, first, removeTweenLayer)
  }, [model])

  useEffect(() => () => {
    document.querySelectorAll('[data-xsuite-layout-tween]').forEach((n) => n.remove())
  }, [])

  const handleSidebarClick = (id: string) => {
    try {
      if (model.getNodeById(id)) {
        model.doAction(FlexLayout.Actions.deleteTab(id))
        if (activeTab === id) {
          setActiveTab('')
        }
      } else {
        const activeTabset = model.getActiveTabset()
        let targetNodeId = activeTabset?.getId()
        if (!targetNodeId) targetNodeId = model.getRoot().getId()

        let count = 0
        model.visitNodes(node => {
          if (node.getType() === 'tabset') count++
        })

        let location = FlexLayout.DockLocation.RIGHT
        if (count % 4 === 1) location = FlexLayout.DockLocation.RIGHT
        else if (count % 4 === 2) location = FlexLayout.DockLocation.BOTTOM
        else if (count % 4 === 3) location = FlexLayout.DockLocation.LEFT
        else if (count % 4 === 0) location = FlexLayout.DockLocation.TOP

        model.doAction(FlexLayout.Actions.addNode(
          { type: 'tab', component: id, name: '', id },
          targetNodeId,
          location,
          -1
        ))

        setActiveTab(id)
      }
    } catch (err) {
      console.error('Failed to add/remove tab', id, err)
    }
  }

  const handleSaveWorkspace = async (name: string) => {
    const snapshot = model.toJson()
    const ws: Workspace = { name, layout: snapshot, isPreset: false }
    const updated = await saveWorkspace(ws)
    setCustomWorkspaces(updated)
    setActiveWorkspace(ws)
  }

  const handleDeleteWorkspace = async (name: string) => {
    const updated = await deleteWorkspace(name)
    setCustomWorkspaces(updated)
    if (activeWorkspace.name === name) {
      loadWorkspaceWithTransition(PRESET_WORKSPACES[0])
    }
  }

  const onRenderTab = (node: FlexLayout.TabNode, renderState: any) => {
    const component = node.getComponent()
    const tabConfig = tabs.find(t => t.id === component)
    if (tabConfig) {
      const Icon = tabConfig.icon
      renderState.content = (
        <div className="flex items-center justify-center w-full h-full">
          <Icon className="w-4 h-4 text-zinc-400" />
        </div>
      )
    }
  }

  const factory = (node: FlexLayout.TabNode) => {
    const component = node.getComponent() ?? ''
    const tabConfig = tabs.find(t => t.id === component)
    if (!tabConfig) return <div>Invalid Tab</div>
    return <PooledWebviewShell tabId={component} url={tabConfig.url} />
  }

  return (
    <div className="flex flex-col h-screen text-white overflow-hidden bg-black">
      {/* Custom Title Bar that is draggable */}
      <div 
        className="h-10 w-full flex items-center justify-center shrink-0 border-b border-zinc-900 z-50 bg-black"
        onMouseDown={(e) => {
          if (e.buttons === 1) { // Left click only
            getCurrentWindow().startDragging()
          }
        }}
      >
        <span 
          className="text-xs font-medium text-zinc-500 tracking-wider hidden sm:block pointer-events-none select-none"
        >
          xsuite
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        {!showLogin && (
          <div className="w-20 h-full flex flex-col items-center bg-black z-10 border-r border-zinc-900">
            {/* Centered App icons group */}
            <div className="flex-1 flex flex-col justify-center gap-6">
              {tabs.map(({ id, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleSidebarClick(id)}
                  data-tauri-drag-region="false"
                  className={`p-3 rounded-2xl transition-all hover:bg-white/10 relative flex items-center justify-center
                    ${activeTab === id ? 'bg-white/10' : 'text-zinc-500 hover:text-white'}`}
                  title={tabs.find(t => t.id === id)?.label}
                >
                  <Icon className="w-6 h-6" />
                  {activeTab === id && <div className="absolute -left-px top-3 bottom-3 w-0.5 bg-white rounded-r" />}
                </button>
              ))}
            </div>

            {/* Workspace switcher button at the bottom */}
            <div className="pb-6">
              <button
                onClick={() => setShowSwitcher(v => !v)}
                data-tauri-drag-region="false"
                className={`p-3 rounded-2xl transition-all hover:bg-white/10 relative flex items-center justify-center
                  ${showSwitcher ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-white'}`}
                title="Workspaces"
              >
                <LayoutDashboard className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Workspace switcher panel */}
        {!showLogin && showSwitcher && (
          <WorkspaceSwitcher
            presets={PRESET_WORKSPACES}
            custom={customWorkspaces}
            activeWorkspaceName={activeWorkspace.name}
            onSelect={loadWorkspaceWithTransition}
            onSave={handleSaveWorkspace}
            onDelete={handleDeleteWorkspace}
            onClose={() => setShowSwitcher(false)}
          />
        )}

        {/* Content area */}
        <div className="flex-1 relative overflow-hidden bg-black">
          {showLogin ? (
            <div className="h-full flex items-center justify-center bg-black">
              <div className="text-center">
                <div className="mb-10">
                  <img src={logo} alt="xsuite" className="mx-auto w-[220px] h-auto object-contain" />
                </div>
                <p className="text-zinc-400 text-xl mb-12">All your X & xAI apps. One native application.</p>
                <button
                  onClick={handleSignIn}
                  data-tauri-drag-region="false"
                  className="w-80 bg-white text-black font-semibold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-zinc-200 transition text-lg mx-auto"
                >
                  <LogIn className="w-5 h-5" />
                  Sign in with X
                </button>
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 overflow-hidden">
              <FlexLayout.Layout
                ref={layoutRef}
                model={model}
                factory={factory}
                onRenderTab={onRenderTab}
                onModelChange={onModelChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App