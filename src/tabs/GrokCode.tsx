import { useState, useRef, useEffect } from 'react';
import { Send, Plus, BrainCircuit, ChevronDown, Check, Trash2, Zap, Terminal, X as XIcon } from 'lucide-react';
import OpenAI from 'openai';
import { useGrokCodeStore, type Project } from '../grokCodeStore';
import { open } from '@tauri-apps/plugin-dialog';

const MODELS = [
  { 
    id: 'grok-4.20-reasoning', 
    name: 'Grok 4.20 Reasoning', 
    inputPrice: '$2.00', 
    outputPrice: '$6.00', 
    description: 'Flagship reasoning model with deep chain-of-thought.' 
  },
  { 
    id: 'grok-4.1-fast-reasoning', 
    name: 'Grok 4.1 Fast Reasoning', 
    inputPrice: '$0.20', 
    outputPrice: '$0.50', 
    description: 'High-speed reasoning for high-volume coding tasks.' 
  },
  { 
    id: 'grok-code-fast-1', 
    name: 'Grok Code Fast', 
    inputPrice: '$0.20', 
    outputPrice: '$1.50', 
    description: 'Specialized for code generation and architectural analysis.' 
  }
];

export function GrokCode() {
  const { projects, chats, addProject, addMessage, clearChat } = useGrokCodeStore();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0]);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!activeProjectId && projects.length > 0) {
      setActiveProjectId(projects[0].id);
    }
  }, [projects]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, activeProjectId, isLoading]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModelDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddProject = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select Project Workspace'
      });

      if (selected && typeof selected === 'string') {
        const folderName = selected.split(/[/\\]/).pop() || selected;
        const newProject: Project = {
          id: selected + '-' + Date.now(),
          name: folderName,
          path: selected,
        };
        addProject(newProject);
        setActiveProjectId(newProject.id);
      }
    } catch (e) {
      console.error('Dialog access denied', e);
    }
  };

  const handleSend = async () => {
    const apiKey = localStorage.getItem('xai-api-key');
    if (!apiKey) return alert('Enter your xAI API key in Grok Chat settings');
    if (!input.trim() || isLoading || !activeProjectId) return;

    const userMessage = input.trim();
    setInput('');
    addMessage(activeProjectId, { role: 'user', content: userMessage });
    setIsLoading(true);

    try {
      const client = new OpenAI({
        apiKey,
        baseURL: 'https://api.x.ai/v1',
        dangerouslyAllowBrowser: true,
      });

      const projectMessages = chats[activeProjectId] || [];
      const completion = await client.chat.completions.create({
        model: selectedModel.id,
        messages: [
          { 
            role: 'system', 
            content: `You are an elite coding agent. You act as a pair programmer for the workspace: ${projects.find(p => p.id === activeProjectId)?.name}. Focus on providing clean, efficient, and precise solutions.` 
          },
          ...projectMessages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: userMessage }
        ],
      });

      const assistantMessage = completion.choices[0].message.content || 'No response.';
      addMessage(activeProjectId, { role: 'assistant', content: assistantMessage });
    } catch (e: any) {
      addMessage(activeProjectId, { role: 'assistant', content: `Error: ${e.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const activeMessages = activeProjectId ? (chats[activeProjectId] || []) : [];
  const activeProject = projects.find(p => p.id === activeProjectId);

  return (
    <div className="flex h-full bg-black text-zinc-100 font-sans selection:bg-white/20 relative overflow-hidden">
      {/* Sidebar: Clean Navigator */}
      <div className="w-64 border-r border-zinc-900 bg-black flex flex-col shrink-0">
        <div className="p-6 flex items-center justify-between">
           <button onClick={handleAddProject} className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-widest">
             <Plus className="w-3 h-3" />
             Link Project
           </button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1 scrollbar-hide">
          {projects.map((proj) => (
            <div key={proj.id} className="group relative">
              <button
                onClick={() => setActiveProjectId(proj.id)}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-3
                  ${activeProjectId === proj.id 
                    ? 'bg-zinc-900 text-white' 
                    : 'text-zinc-500 hover:bg-zinc-900 hover:text-zinc-300'}`}
              >
                <Terminal className={`w-3.5 h-3.5 shrink-0 ${activeProjectId === proj.id ? 'text-white' : 'text-zinc-800'}`} />
                <span className="truncate flex-1 font-medium">{proj.name}</span>
              </button>
              {activeProjectId === proj.id && (
                <button 
                  onClick={(e) => { e.stopPropagation(); clearChat(proj.id); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 opacity-0 group-hover:opacity-100 hover:bg-zinc-800 rounded-lg transition-all"
                  title="Clear Chat History"
                >
                  <Trash2 className="w-3 h-3 text-zinc-600 hover:text-red-400" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Area: Grok.com centered chat */}
      <div className="flex-1 flex flex-col min-w-0 bg-black relative">
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="max-w-3xl mx-auto px-6 py-16 space-y-12">
            {!activeProject && (
              <div className="h-[50vh] flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in duration-700">
                <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-2xl">
                  <BrainCircuit className="w-8 h-8 text-white stroke-[1.5px]" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight">Code Agent</h1>
                  <p className="text-zinc-500 text-sm">Link a local project workspace to enable agentic reasoning.</p>
                </div>
              </div>
            )}

            {activeProject && activeMessages.length === 0 && (
              <div className="h-[10vh] flex flex-col items-center justify-center text-center space-y-2 opacity-10">
                <Terminal className="w-6 h-6 text-white" />
                <p className="text-[10px] font-bold uppercase tracking-[0.3em]">{activeProject.name}</p>
              </div>
            )}

            {activeMessages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-400`}
              >
                <div 
                  className={`max-w-[95%] text-[15px] leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-zinc-900 text-zinc-100 px-6 py-4 rounded-[2rem] border border-zinc-800' 
                      : 'text-zinc-200 w-full'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2.5 mb-5">
                      <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-lg">
                        <XIcon className="w-3.5 h-3.5 text-black stroke-[4px]" />
                      </div>
                      <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white">Grok</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap font-sans px-1 text-zinc-300">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start animate-pulse w-full">
                <div className="space-y-5 w-full">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-zinc-800" />
                    <div className="h-2 w-16 bg-zinc-800 rounded-full" />
                  </div>
                  <div className="space-y-2.5 pl-8">
                    <div className="h-3 w-4/5 bg-zinc-900 rounded-full" />
                    <div className="h-3 w-2/3 bg-zinc-900 rounded-full" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-44" />
          </div>
        </div>

        {/* Floating Input: Grok.com aesthetic */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/90 to-transparent pt-20 pb-10 px-6 z-10">
          <div className="max-w-3xl mx-auto flex flex-col items-center gap-4">
            <div className="w-full relative group">
              <div className="bg-zinc-900/60 backdrop-blur-2xl border border-zinc-800 rounded-3xl p-3 focus-within:border-zinc-600 transition-all shadow-2xl">
                <textarea
                  rows={1}
                  placeholder={activeProject ? `Message Grok (${activeProject.name})...` : "Select a project workspace..."}
                  className="w-full bg-transparent pl-5 pr-14 py-3 text-lg focus:outline-none resize-none placeholder:text-zinc-700 text-zinc-200"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={!activeProject}
                />
                <button 
                  onClick={handleSend}
                  disabled={isLoading || !input.trim() || !activeProject}
                  className="absolute right-5 top-5 p-2.5 bg-white text-black rounded-full hover:scale-105 active:scale-95 transition-all disabled:opacity-10 shadow-xl"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Model Selector & Context Indicator */}
            <div className="flex items-center gap-5 relative" ref={dropdownRef}>
               <button 
                 onClick={() => setShowModelDropdown(!showModelDropdown)}
                 className="flex items-center gap-2 text-[11px] font-bold text-zinc-500 hover:text-white transition-colors uppercase tracking-[0.2em]"
               >
                 {selectedModel.name}
                 <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showModelDropdown ? 'rotate-180' : ''}`} />
               </button>

               {showModelDropdown && (
                 <div className="absolute bottom-full mb-4 w-80 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
                   {MODELS.map(model => (
                     <button
                       key={model.id}
                       onClick={() => {
                         setSelectedModel(model);
                         setShowModelDropdown(false);
                       }}
                       className="w-full text-left p-3 rounded-xl hover:bg-white/5 transition-all group relative"
                     >
                       <div className="flex items-center justify-between mb-1">
                         <span className="text-sm font-bold text-zinc-300 group-hover:text-white">
                           {model.name}
                         </span>
                         {selectedModel.id === model.id && <Check className="w-4 h-4 text-white" />}
                       </div>
                       
                       <div className="absolute left-full ml-4 top-0 w-64 bg-zinc-950 border border-zinc-800 p-4 rounded-2xl opacity-0 pointer-events-none group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 z-[110] shadow-2xl">
                          <p className="text-xs text-zinc-400 leading-relaxed mb-3">{model.description}</p>
                          <div className="space-y-1.5 pt-3 border-t border-white/5">
                            <div className="flex justify-between text-[10px] font-bold uppercase">
                              <span className="text-zinc-600 tracking-widest">Input</span>
                              <span className="text-emerald-500 font-mono">{model.inputPrice}/1M</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold uppercase">
                              <span className="text-zinc-600 tracking-widest">Output</span>
                              <span className="text-emerald-500 font-mono">{model.outputPrice}/1M</span>
                            </div>
                          </div>
                       </div>
                     </button>
                   ))}
                 </div>
               )}

               <div className="w-px h-4 bg-zinc-800/50" />
               
               <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-700 uppercase tracking-[0.2em] cursor-default">
                 <Zap className="w-3.5 h-3.5 text-zinc-800" />
                 Context: 2M Tokens
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
