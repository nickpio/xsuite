import * as FlexLayout from 'flexlayout-react'

export interface Workspace {
  name: string
  layout: FlexLayout.IJsonModel
  isPreset?: boolean
}

const GLOBAL = {
  tabEnableClose: true,
  enableEdgeDock: true,
  splitterSize: 3,
}

export const PRESET_WORKSPACES: Workspace[] = [
  {
    name: 'Command Center',
    isPreset: true,
    layout: {
      global: GLOBAL,
      borders: [],
      layout: {
        type: 'row', weight: 100,
        children: [
          { type: 'tabset', weight: 25, children: [{ type: 'tab', name: '', component: 'x', id: 'x' }] },
          { type: 'tabset', weight: 50, children: [{ type: 'tab', name: '', component: 'grok', id: 'grok' }] },
          {
            type: 'row', weight: 25,
            children: [
              { type: 'tabset', weight: 50, children: [{ type: 'tab', name: '', component: 'console', id: 'console' }] },
              { type: 'tabset', weight: 50, children: [{ type: 'tab', name: '', component: 'grokipedia', id: 'grokipedia' }] },
            ]
          }
        ]
      }
    }
  },
  {
    name: 'Research',
    isPreset: true,
    layout: {
      global: GLOBAL,
      borders: [],
      layout: {
        type: 'row', weight: 100,
        children: [
          { type: 'tabset', weight: 35, children: [{ type: 'tab', name: '', component: 'grokipedia', id: 'grokipedia' }] },
          { type: 'tabset', weight: 45, children: [{ type: 'tab', name: '', component: 'grok', id: 'grok' }] },
          { type: 'tabset', weight: 20, children: [{ type: 'tab', name: '', component: 'x', id: 'x' }] },
        ]
      }
    }
  },
  {
    name: 'Content Creation',
    isPreset: true,
    layout: {
      global: GLOBAL,
      borders: [],
      layout: {
        type: 'row', weight: 100,
        children: [
          { type: 'tabset', weight: 60, children: [{ type: 'tab', name: '', component: 'grok', id: 'grok' }] },
          { type: 'tabset', weight: 40, children: [{ type: 'tab', name: '', component: 'x', id: 'x' }] },
        ]
      }
    }
  },
  {
    name: 'Focus',
    isPreset: true,
    layout: {
      global: GLOBAL,
      borders: [],
      layout: {
        type: 'row', weight: 100,
        children: [
          { type: 'tabset', weight: 100, children: [{ type: 'tab', name: '', component: 'grok', id: 'grok' }] },
        ]
      }
    }
  },
]
