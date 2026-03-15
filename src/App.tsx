import { useState, useEffect, useCallback } from 'react'
import { BookOpen, LogIn, LayoutDashboard } from 'lucide-react'
import { FaXTwitter } from 'react-icons/fa6'
import { XAI, Grok } from '@lobehub/icons'
import * as FlexLayout from 'flexlayout-react'
import logo from './assets/x-suite-logo.png'
import { PRESET_WORKSPACES, type Workspace } from './workspaces'
import { WorkspaceSwitcher } from './WorkspaceSwitcher'

const tabs = [
  { id: 'x', label: 'X', icon: FaXTwitter, url: 'https://x.com' },
  { id: 'grok', label: 'Grok', icon: Grok, url: 'https://grok.com' },
  { id: 'console', label: 'Console', icon: XAI, url: 'https://console.x.ai' },
  { id: 'grokipedia', label: 'Grokipedia', icon: BookOpen, url: 'https://grokipedia.com' },
]

const SHARED_PARTITION = 'persist:xsuite'

// IPC bridge (injected by Electron preload)
const ipc = (window as any).ipcRenderer as {
  invoke: (channel: string, ...args: any[]) => Promise<any>
  on: (channel: string, listener: (...args: any[]) => void) => void
  off: (channel: string, listener: (...args: any[]) => void) => void
}

function buildModel(layout: FlexLayout.IJsonModel) {
  return FlexLayout.Model.fromJson(layout)
}

function App() {
  const [showLogin, setShowLogin] = useState(true)
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace>(PRESET_WORKSPACES[0])
  const [model, setModel] = useState(() => buildModel(PRESET_WORKSPACES[0].layout))
  const [customWorkspaces, setCustomWorkspaces] = useState<Workspace[]>([])
  const [showSwitcher, setShowSwitcher] = useState(false)
  const [activeTab, setActiveTab] = useState('grok')

  // Load persisted custom workspaces on mount
  useEffect(() => {
    ipc.invoke('load-workspaces').then((saved: Workspace[]) => {
      if (saved?.length) setCustomWorkspaces(saved)
    }).catch(() => {})
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

  const loadWorkspace = (ws: Workspace) => {
    setActiveWorkspace(ws)
    setModel(buildModel(ws.layout))
  }

  const handleSidebarClick = (id: string) => {
    try {
      if (model.getNodeById(id)) {
        model.doAction(FlexLayout.Actions.selectTab(id))
      } else {
        let targetNodeId = model.getActiveTabset()?.getId()
        if (!targetNodeId) targetNodeId = model.getRoot().getId()
        model.doAction(FlexLayout.Actions.addNode(
          { type: 'tab', component: id, name: '', id },
          targetNodeId,
          FlexLayout.DockLocation.CENTER,
          -1
        ))
      }
      setActiveTab(id)
    } catch (err) {
      console.error('Failed to add/select tab', id, err)
    }
  }

  const handleSaveWorkspace = async (name: string) => {
    const snapshot = model.toJson()
    const ws: Workspace = { name, layout: snapshot, isPreset: false }
    const updated: Workspace[] = await ipc.invoke('save-workspace', ws)
    setCustomWorkspaces(updated)
    setActiveWorkspace(ws)
  }

  const handleDeleteWorkspace = async (name: string) => {
    const updated: Workspace[] = await ipc.invoke('delete-workspace', name)
    setCustomWorkspaces(updated)
    if (activeWorkspace.name === name) {
      loadWorkspace(PRESET_WORKSPACES[0])
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
    const component = node.getComponent()
    const tabConfig = tabs.find(t => t.id === component)
    if (!tabConfig) return <div>Invalid Tab</div>
    return (
      <webview
        src={tabConfig.url}
        partition={SHARED_PARTITION}
        className="w-full h-full border-0"
        style={{ background: '#000', display: 'flex' }}
        allowpopups
      />
    )
  }

  return (
    <div className="flex h-screen text-white overflow-hidden">
      {/* Sidebar */}
      {!showLogin && (
        <div className="w-20 h-full flex flex-col items-center bg-black z-10 border-r border-zinc-900">
          {/* Centered App icons group */}
          <div className="flex-1 flex flex-col justify-center gap-6">
            {tabs.map(({ id, icon: Icon }) => (
              <button
                key={id}
                onClick={() => handleSidebarClick(id)}
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
          onSelect={loadWorkspace}
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
              model={model}
              factory={factory}
              onRenderTab={onRenderTab}
              onModelChange={onModelChange}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default App