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
      borders: [
        {
          type: 'border',
          location: 'right',
          size: 450,
          children: [
            {
              type: 'tab',
              name: 'Grok Chat',
              component: 'grok',
              id: 'grok',
              enableClose: false
            }
          ]
        }
      ],
      layout: {
        type: 'row',
        weight: 100,
        children: [
          {
            type: 'tabset',
            weight: 100,
            children: [
              { type: 'tab', name: 'X', component: 'x', id: 'x' },
              { type: 'tab', name: 'Grokipedia', component: 'grokipedia', id: 'grokipedia' },
              { type: 'tab', name: 'Grok Code', component: 'grokcode', id: 'grokcode' }
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
          { type: 'tabset', weight: 35, children: [{ type: 'tab', name: 'Grokipedia', component: 'grokipedia', id: 'grokipedia' }] },
          { type: 'tabset', weight: 45, children: [{ type: 'tab', name: 'Grok', component: 'grok', id: 'grok' }] },
          { type: 'tabset', weight: 20, children: [{ type: 'tab', name: 'X', component: 'x', id: 'x' }] },
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
          { type: 'tabset', weight: 60, children: [{ type: 'tab', name: 'Grok', component: 'grok', id: 'grok' }] },
          { type: 'tabset', weight: 40, children: [{ type: 'tab', name: 'X', component: 'x', id: 'x' }] },
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
          { type: 'tabset', weight: 100, children: [{ type: 'tab', name: 'Grok', component: 'grok', id: 'grok' }] },
        ]
      }
    }
  },
]
