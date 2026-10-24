/* Documents shared with only some people on a shared trip ("Who can see it" in the Wallet). They
   are not part of the trip, which everyone on it reads: each is a row in trip_docs_limited, with
   its file under "<trip id>/limited/<doc id>/", and the database lets only who added it and the
   people picked see either (schema.sql). Kept on the phone by trip, so they open with no signal. */
import { useEffect, useSyncExternalStore } from 'react';
import type { Doc } from '../model/types';
import { getState } from '../model/store';
import { supabase } from './engine';
import { fetchMissing } from './files';

const KEY = 'wt-limited-docs';
type All = Record<string, Doc[]>;
const listeners = new Set<() => void>();
let all: All = (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}') as All; } catch { return {}; } })();

function set(next: All) {
  all = next;
  try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* full */ }
  listeners.forEach(l => l());
}
const put = (tripId: string, list: Doc[]) => set({ ...all, [tripId]: list });

export const limitedDocs = (tripId: string) => all[tripId] || [];

/** Fetches the ones you may see, and their files, so they're on the phone for later. */
export async function refreshLimited(tripId: string) {
  if (!getState().sync[tripId] || !navigator.onLine) return;
  const { data, error } = await supabase.from('trip_docs_limited').select('id, owner, viewers, doc').eq('trip_id', tripId);
  /* before schema.sql has the table, there are simply none */
  if (error || !data) return;
  const list = data.map(r => ({ ...(r.doc as Doc), id: r.id as string, limited: true, owner: r.owner as string, viewers: (r.viewers as string[]) || [] }));
  put(tripId, list);
  void fetchMissing(list.flatMap(d => (d.file ? [d.file.path] : []))).catch(() => {});
}

/** This trip's limited documents; fetched again when the page opens and on pull to refresh. */
export function useLimitedDocs(tripId: string): Doc[] {
  const list = useSyncExternalStore(l => { listeners.add(l); return () => listeners.delete(l); }, () => all)[tripId] || [];
  useEffect(() => {
    void refreshLimited(tripId);
    const again = () => void refreshLimited(tripId);
    window.addEventListener('wt-refresh', again);
    return () => window.removeEventListener('wt-refresh', again);
  }, [tripId]);
  return list;
}

export async function saveLimited(tripId: string, d: Doc) {
  const { id, limited: _l, owner: _o, viewers, private: _p, ...doc } = d;
  const { error } = await supabase.from('trip_docs_limited')
    .upsert({ id, trip_id: tripId, viewers: viewers || [], doc, updated_at: new Date().toISOString() });
  if (error) throw new Error(/relation|does not exist/i.test(error.message)
    ? 'Sharing with some people needs a database update first (schema.sql).' : 'Could not save it. Check your signal and try again.');
  const list = limitedDocs(tripId), next = { ...d, limited: true };
  put(tripId, list.some(x => x.id === id) ? list.map(x => (x.id === id ? { ...x, ...next } : x)) : [...list, next]);
}

export async function deleteLimited(tripId: string, id: string) {
  const { error } = await supabase.from('trip_docs_limited').delete().eq('id', id);
  if (error) throw new Error('Could not remove it. Check your signal and try again.');
  put(tripId, limitedDocs(tripId).filter(x => x.id !== id));
}
