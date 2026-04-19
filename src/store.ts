import { Store } from '@tauri-apps/plugin-store';
import type { Workspace } from './workspaces';

// Lazy load utility for v2 plugin API
let storePromise: Promise<Store> | null = null;
async function getStore() {
  if (!storePromise) {
    storePromise = Store.load('workspaces.json');
  }
  return storePromise;
}

export async function loadWorkspaces(): Promise<Workspace[]> {
  const store = await getStore();
  const ws = await store.get<Workspace[]>('workspaces');
  return ws || [];
}

export async function saveWorkspace(workspace: Workspace): Promise<Workspace[]> {
  const store = await getStore();
  const workspaces = await loadWorkspaces();
  const idx = workspaces.findIndex(w => w.name === workspace.name);
  if (idx >= 0) {
    workspaces[idx] = workspace;
  } else {
    workspaces.push(workspace);
  }
  await store.set('workspaces', workspaces);
  await store.save();
  return workspaces;
}

export async function deleteWorkspace(name: string): Promise<Workspace[]> {
  const store = await getStore();
  const workspaces = await loadWorkspaces();
  const filtered = workspaces.filter(w => w.name !== name);
  await store.set('workspaces', filtered);
  await store.save();
  return filtered;
}
