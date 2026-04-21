import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  id: string
  timestamp: number
}

interface GrokState {
  messages: Message[]
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  clearMessages: () => void
}

export const useGrokStore = create<GrokState>()(
  persist(
    (set) => ({
      messages: [],
      addMessage: (msg) => set((state) => ({
        messages: [
          ...state.messages,
          {
            ...msg,
            id: Math.random().toString(36).substring(7),
            timestamp: Date.now()
          }
        ]
      })),
      clearMessages: () => set({ messages: [] }),
    }),
    {
      name: 'grok-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
