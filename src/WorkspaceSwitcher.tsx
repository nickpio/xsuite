import { useState } from 'react'
import { Plus, Trash2, Check, LayoutDashboard } from 'lucide-react'
import type { Workspace } from './workspaces'

interface Props {
  presets: Workspace[]
  custom: Workspace[]
  activeWorkspaceName: string
  onSelect: (ws: Workspace) => void
  onSave: (name: string) => void
  onDelete: (name: string) => void
  onClose: () => void
}

export function WorkspaceSwitcher({ presets, custom, activeWorkspaceName, onSelect, onSave, onDelete, onClose }: Props) {
  const [saving, setSaving] = useState(false)
  const [newName, setNewName] = useState('')

  const handleSave = () => {
    const trimmed = newName.trim()
    if (!trimmed) return
    onSave(trimmed)
    setNewName('')
    setSaving(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed left-24 bottom-16 z-50 w-64 rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800">
          <LayoutDashboard className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-semibold text-zinc-300 uppercase tracking-widest">Workspaces</span>
        </div>

        <div className="py-1.5 max-h-80 overflow-y-auto">
          {/* Presets */}
          <div className="px-3 pt-2 pb-1">
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-1">Presets</p>
            {presets.map(ws => (
              <WorkspaceRow
                key={ws.name}
                ws={ws}
                isActive={ws.name === activeWorkspaceName}
                onSelect={() => { onSelect(ws); onClose() }}
                onDelete={undefined}
              />
            ))}
          </div>

          {/* Custom */}
          {custom.length > 0 && (
            <div className="px-3 pt-2 pb-1 border-t border-zinc-800/60 mt-1">
              <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-1">Saved</p>
              {custom.map(ws => (
                <WorkspaceRow
                  key={ws.name}
                  ws={ws}
                  isActive={ws.name === activeWorkspaceName}
                  onSelect={() => { onSelect(ws); onClose() }}
                  onDelete={() => onDelete(ws.name)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Save current layout */}
        <div className="border-t border-zinc-800 px-3 py-2.5">
          {saving ? (
            <div className="flex gap-2">
              <input
                autoFocus
                type="text"
                placeholder="Workspace name…"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setSaving(false) }}
                className="flex-1 bg-zinc-900 text-white text-sm rounded-lg px-3 py-1.5 border border-zinc-700 outline-none focus:border-zinc-500 placeholder:text-zinc-600"
              />
              <button
                onClick={handleSave}
                className="p-1.5 rounded-lg bg-white text-black hover:bg-zinc-200 transition"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setSaving(true)}
              className="flex items-center gap-2 w-full text-sm text-zinc-400 hover:text-white transition py-1 group"
            >
              <Plus className="w-4 h-4 group-hover:text-white transition" />
              Save current layout
            </button>
          )}
        </div>
      </div>
    </>
  )
}

function WorkspaceRow({
  ws,
  isActive,
  onSelect,
  onDelete,
}: {
  ws: Workspace
  isActive: boolean
  onSelect: () => void
  onDelete?: () => void
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-lg px-2 py-1.5 cursor-pointer group transition
        ${isActive ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}
      onClick={onSelect}
    >
      <span className="text-sm truncate">{ws.name}</span>
      <div className="flex items-center gap-1 ml-2 shrink-0">
        {isActive && <Check className="w-3.5 h-3.5 text-zinc-300" />}
        {onDelete && (
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="opacity-0 group-hover:opacity-100 transition p-0.5 rounded hover:bg-white/10"
          >
            <Trash2 className="w-3 h-3 text-zinc-500 hover:text-red-400 transition" />
          </button>
        )}
      </div>
    </div>
  )
}
