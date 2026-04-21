import { useState, useEffect, useRef } from 'react'
import { BookOpen, LogIn, BrainCircuit, MessageSquare } from 'lucide-react'
import { FaXTwitter } from 'react-icons/fa6'
import { XAI } from '@lobehub/icons'
import logo from './assets/x-suite-logo.png'
import { dockWebview, showWebview, hideWebview } from './webviewPool'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { GrokChat } from './tabs/GrokChat'
import { GrokCode } from './tabs/GrokCode'

const tabs = [
  { id: 'x', label: 'X', icon: FaXTwitter, url: 'https://x.com' },
  { id: 'grokcode', label: 'Grok Code', icon: BrainCircuit, url: '' },
  { id: 'console', label: 'Console', icon: XAI, url: 'https://console.x.ai' },
  { id: 'grokipedia', label: 'Grokipedia', icon: BookOpen, url: 'https://grokipedia.com' },
]

function PooledWebviewShell({ tabId, url, active }: { tabId: string; url: string, active: boolean }) {
  const shellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = shellRef.current
    if (!el) return
    return dockWebview(tabId, url, el)
  }, [tabId, url])

  useEffect(() => {
    if (active) showWebview(tabId)
    else hideWebview(tabId)
  }, [active, tabId])

  return (
    <div
      ref={shellRef}
      className={`absolute inset-0 transition-opacity duration-300 ${active ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
      data-xsuite-tab={tabId}
    />
  )
}

export default function App() {
  const [showLogin, setShowLogin] = useState(true)
  const [activeTab, setActiveTab] = useState('x')
  const [showGrokChat, setShowGrokChat] = useState(false)
  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(new Set(['x']))

  const handleSignIn = () => {
    setShowLogin(false)
  }

  const handleTabSwitch = (id: string) => {
    setActiveTab(id)
    setVisitedTabs(prev => new Set(prev).add(id))
  }

  return (
    <div className="flex flex-col h-screen text-white overflow-hidden bg-black font-sans">
      {/* Custom Title Bar */}
      <div 
        className="h-10 w-full flex items-center justify-center shrink-0 border-b border-white/5 z-[100] bg-black select-none"
        onMouseDown={(e) => {
          if (e.buttons === 1) getCurrentWindow().startDragging()
        }}
      >
        <span className="text-[10px] font-bold text-zinc-600 tracking-[0.3em] uppercase">
          xsuite
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        {!showLogin && (
          <div className="w-20 h-full flex flex-col items-center bg-[#050505] z-[100] border-r border-white/5 relative">
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
              {tabs.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => handleTabSwitch(id)}
                  className={`p-3.5 rounded-2xl transition-all duration-200 relative group
                    ${activeTab === id ? 'bg-white/10 text-white shadow-xl' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                  title={label}
                >
                  <Icon className="w-5 h-5" />
                  {activeTab === id && (
                    <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-white rounded-r shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
                  )}
                </button>
              ))}
              
              <div className="w-8 h-px bg-white/5 my-2" />
              
              <button
                onClick={() => setShowGrokChat(!showGrokChat)}
                className={`p-3.5 rounded-2xl transition-all duration-200 relative
                  ${showGrokChat ? 'bg-purple-500/20 text-purple-400' : 'text-zinc-500 hover:text-purple-300 hover:bg-white/5'}`}
                title="Grok Chat"
              >
                <MessageSquare className="w-5 h-5" />
                {showGrokChat && (
                   <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-purple-500 rounded-r shadow-[0_0_10px_rgba(168,85,247,0.5)]" />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 relative overflow-hidden bg-black flex">
          {showLogin ? (
            <div className="h-full flex-1 flex items-center justify-center bg-black">
              <div className="text-center animate-in fade-in zoom-in duration-700">
                <div className="mb-10">
                  <img src={logo} alt="xsuite" className="mx-auto w-[180px] h-auto object-contain opacity-90" />
                </div>
                <p className="text-zinc-500 text-lg mb-12 font-medium tracking-tight">One native application. All your xAI tools.</p>
                <button
                  onClick={handleSignIn}
                  className="w-72 bg-white text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all active:scale-95 shadow-2xl"
                >
                  <LogIn className="w-5 h-5" />
                  Enter Suite
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 overflow-hidden relative">
              {/* Main Viewport */}
              <div className="flex-1 relative bg-black min-w-0">
                {tabs.map((tab) => {
                  const isVisible = activeTab === tab.id;
                  const isVisited = visitedTabs.has(tab.id);
                  
                  if (!isVisited) return null;

                  return tab.url ? (
                    <PooledWebviewShell 
                      key={tab.id} 
                      tabId={tab.id} 
                      url={tab.url} 
                      active={isVisible} 
                    />
                  ) : (
                    <div 
                      key={tab.id}
                      className={`absolute inset-0 transition-opacity duration-300 ${isVisible ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
                    >
                      {tab.id === 'grokcode' && <GrokCode />}
                    </div>
                  );
                })}
              </div>

              {/* Sliding Grok Chat Panel - Physically resizes the flex container */}
              <div 
                className={`h-full border-l border-white/5 bg-[#09090b] shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] overflow-hidden shrink-0
                  ${showGrokChat ? 'w-[450px] opacity-100' : 'w-0 opacity-0 pointer-events-none'}`}
              >
                <div className="w-[450px] h-full">
                  <GrokChat />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
