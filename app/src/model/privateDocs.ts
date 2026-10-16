/* Private documents (passports, IDs): kept on this phone only, by trip, never part of the shared
   trip and never uploaded. Their files live under "private/" (sync/files.ts). */
import { useSyncExternalStore } from 'react';
import type { Doc } from './types';
import { backupSoon } from '../native';

const KEY = 'wt-private-docs';
type All = Record<string, Doc[]>;
const listeners = new Set<() => void>();
let all: All = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') as All; } catch { return {}; } })();

function set(next: All) {
  all = next;
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* full */ }
  backupSoon();
  listeners.forEach(l => l());
}

export function usePrivateDocs(tripId: string): Doc[] {
  return useSyncExternalStore(l => { listeners.add(l); return () => listeners.delete(l); }, () => all)[tripId] || [];
}
export const privateDocs = (tripId: string) => all[tripId] || [];

export function savePrivateDoc(tripId: string, d: Doc) {
  const list = all[tripId] || [];
  set({ ...all, [tripId]: list.some(x => x.id === d.id) ? list.map(x => (x.id === d.id ? d : x)) : [...list, d] });
}
export function deletePrivateDoc(tripId: string, id: string) {
  set({ ...all, [tripId]: (all[tripId] || []).filter(x => x.id !== id) });
}
