import { useState, useRef, useEffect } from 'react'
import { Send, Trash2, Settings, BrainCircuit, Sparkles, X as XIcon } from 'lucide-react'
import { Grok } from '@lobehub/icons'
import OpenAI from 'openai'
import { useGrokStore } from '../grokStore'
import { listen } from '@tauri-apps/api/event'
import { invoke } from '@tauri-apps/api/core'
import { getWebview } from '../webviewPool'

export function GrokChat() {
  const { messages, addMessage, clearMessages } = useGrokStore()
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [apiKey, setApiKey] = useState(localStorage.getItem('xai-api-key') || '')
  const [showSettings, setShowSettings] = useState(!localStorage.getItem('xai-api-key'))
  const [context, setContext] = useState<{ text: string, url: string, title: string } | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  useEffect(() => {
    const unlisten = listen<{text: string, url: string, title: string}>('xsuite-scraped-data', (event) => {
      setContext(event.payload)
    })
    return () => {
      unlisten.then(f => f())
    }
  }, [])

  const handleSend = async () => {
    const currentKey = localStorage.getItem('xai-api-key')
    if (!currentKey) {
      setShowSettings(true)
      return
    }
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    
    const fullContent = context 
      ? `Context from ${context.title} (${context.url}):\n\n${context.text.substring(0, 2000)}\n\nUser Question: ${userMessage}`
      : userMessage

    addMessage({ role: 'user', content: userMessage })
    setIsLoading(true)

    try {
      const client = new OpenAI({
        apiKey: currentKey,
        baseURL: 'https://api.x.ai/v1',
        dangerouslyAllowBrowser: true,
      })

      const response = await client.chat.completions.create({
        model: 'grok-4.20-reasoning',
        messages: [
          { role: 'system', content: 'You are Grok, a helpful AI built by xAI. You are native to the xsuite app. Provide concise, insightful answers.' },
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: fullContent }
        ],
      })

      const assistantMessage = response.choices[0].message.content || 'No response from Grok.'
      addMessage({ role: 'assistant', content: assistantMessage })
      if (context) setContext(null)
    } catch (error: any) {
      addMessage({ role: 'assistant', content: `Error: ${error.message}` })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCaptureX = async () => {
    const xWv = getWebview('x')
    if (!xWv) {
      alert('Open X tab first to capture context')
      return
    }
    await invoke('eval_in_webview', {
      label: xWv.label,
      script: 'document.dispatchEvent(new CustomEvent("xsuite-scrape"))',
    })
  }

  const saveApiKey = (key: string) => {
    localStorage.setItem('xai-api-key', key)
    setApiKey(key)
    setShowSettings(false)
  }

  return (
    <div className="flex flex-col h-full bg-[#09090b] text-zinc-100 font-sans selection:bg-white/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/40 backdrop-blur-xl shrink-0">
        <div className="flex items-center gap-3">
          <Grok.Avatar size={32} shape="square" />
          <div>
            <h2 className="text-sm font-bold tracking-tight uppercase">Grok Chat</h2>
            <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Direct Native
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {context && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-[10px] font-bold text-purple-400">
              <Sparkles className="w-3 h-3" />
              CONTEXT
              <button onClick={() => setContext(null)} className="ml-1 hover:text-white">×</button>
            </div>
          )}
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-400 hover:text-white"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button 
            onClick={clearMessages}
            className="p-2 hover:bg-red-500/10 rounded-xl transition-colors text-zinc-400 hover:text-red-400"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="p-6 bg-zinc-900/50 border-b border-white/5 animate-in slide-in-from-top duration-300">
          <div className="max-w-md mx-auto space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">xAI API Configuration</h3>
            <div className="flex gap-3">
              <input 
                type="password"
                placeholder="xai-..."
                className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-white/30"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveApiKey(apiKey)}
              />
              <button 
                onClick={() => saveApiKey(apiKey)}
                className="bg-white text-black text-xs font-bold px-5 py-2 rounded-xl hover:bg-zinc-200"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8 scrollbar-hide">
        {messages.length === 0 && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center opacity-20 text-center space-y-6">
            <BrainCircuit className="w-16 h-16 stroke-[1px]" />
            <p className="text-sm font-bold uppercase tracking-widest">System Ready</p>
          </div>
        )}

        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}
          >
            <div 
              className={`max-w-[85%] rounded-3xl px-6 py-4 text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-zinc-900 text-zinc-100 border border-white/5' 
                  : 'bg-transparent text-zinc-200'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                    <XIcon className="w-3 h-3 text-black stroke-[4px]" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">Grok</span>
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-transparent px-6 py-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-zinc-800" />
                <div className="h-2 w-12 bg-zinc-800 rounded-full" />
              </div>
              <div className="h-3 w-48 bg-zinc-900 rounded-full ml-7" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 pt-0 bg-gradient-to-t from-[#09090b] via-[#09090b] to-transparent">
        <div className="max-w-4xl mx-auto relative group">
          <textarea
            rows={1}
            placeholder="Ask Grok anything..."
            className="w-full bg-zinc-900/50 border border-white/5 rounded-3xl pl-6 pr-14 py-4 text-sm focus:outline-none focus:border-white/20 transition-all resize-none overflow-hidden placeholder:text-zinc-700"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
          />
          <button 
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="absolute right-3 top-3.5 p-2 bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-20 shadow-xl"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4">
           <button 
             onClick={handleCaptureX}
             className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1.5"
           >
             <Sparkles className="w-3 h-3" /> Capture X
           </button>
           <div className="w-px h-2 bg-zinc-800" />
           <span className="text-[9px] text-zinc-700 font-bold uppercase tracking-widest">
             April 2026 Edition
           </span>
        </div>
      </div>
    </div>
  )
}
