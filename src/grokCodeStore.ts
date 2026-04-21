import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface CodeMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  id: string
  timestamp: number
}

export interface Project {
  id: string
  name: string
  path: string
}

interface GrokCodeState {
  projects: Project[]
  chats: Record<string, CodeMessage[]>
  addProject: (project: Project) => void
  addMessage: (projectId: string, msg: Omit<CodeMessage, 'id' | 'timestamp'>) => void
  clearChat: (projectId: string) => void
}

export const useGrokCodeStore = create<GrokCodeState>()(
  persist(
    (set) => ({
      projects: [],
      chats: {},
      addProject: (p) => set((state) => ({
        projects: state.projects.find(x => x.id === p.id) ? state.projects : [...state.projects, p]
      })),
      addMessage: (projectId, msg) => set((state) => {
        const existing = state.chats[projectId] || []
        return {
          chats: {
            ...state.chats,
            [projectId]: [
              ...existing,
              { ...msg, id: Math.random().toString(36).substring(7), timestamp: Date.now() }
            ]
          }
        }
      }),
      clearChat: (projectId) => set((state) => ({
        chats: { ...state.chats, [projectId]: [] }
      }))
    }),
    {
      name: 'grok-code-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
