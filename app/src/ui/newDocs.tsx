/* "Andrea added a ticket for you: Shinkansen to Kyoto": a banner when someone else adds a document
   you can see, a shared one (trip.docs) or one only for some people (sync/limitedDocs.ts). It shows
   the next time the app opens, or straight away if it's open when the trip or the documents update.
   The first time this runs on a phone, what's already there counts as seen, so nobody gets a pile. */
import { useEffect, useState } from 'react';
import type { Doc } from '../model/types';
import { pref, setPref } from '../model/store';
import { refreshLimited, useLimitedDocs } from '../sync/limitedDocs';
import { useSync } from '../sync/engine';
import { useApp } from './ctx';
import { Face } from './planItem';

const same = (a = '', b = '') => a.trim().toLowerCase() === b.trim().toLowerCase();
const WORD: Record<string, string> = { ticket: 'a ticket', booking: 'a booking', insurance: 'insurance', id: 'an ID', other: 'a document' };

export function NewDocNotice() {
  const { ix, me, go } = useApp();
  const t = ix.trip, uid = useSync().session?.user.id;
  const limited = useLimitedDocs(t.id);
  const key = `docs-seen-${t.id}`;
  const [seen, setSeen] = useState<string[] | null>(() => pref<string[] | null>(key, null));
  /* look again for documents only for you when the app comes back to the front */
  useEffect(() => {
    const back = () => { if (!document.hidden) void refreshLimited(t.id); };
    document.addEventListener('visibilitychange', back);
    return () => document.removeEventListener('visibilitychange', back);
  }, [t.id]);
  const all: Doc[] = [...(t.docs || []), ...limited].filter(d => !d.private);
  const fromOthers = (d: Doc) => (d.limited ? d.owner !== uid : !!d.addedBy && !same(d.addedBy, me));
  /* the first look on this phone: everything already there is seen */
  useEffect(() => {
    if (seen === null && !t.sample) { const ids = all.map(d => d.id); setPref(key, ids); setSeen(ids); }
  }, [seen, t.sample]); // eslint-disable-line react-hooks/exhaustive-deps
  if (seen === null || t.sample) return null;
  const fresh = all.filter(d => !seen.includes(d.id) && fromOthers(d));
  if (!fresh.length) return null;
  const d = fresh[0];
  const done = () => { const next = [...seen, ...fresh.map(x => x.id)].slice(-500); setPref(key, next); setSeen(next); };
  const who = d.addedBy || 'Someone';
  return (
    <div className="sharenote" role="status">
      <Face tripId={t.id} name={who} size={30} />
      <span><b>{who}</b> added {WORD[d.kind] || 'a document'} {d.limited ? 'for you' : 'to the trip'}: {d.title}{fresh.length > 1 ? ` (and ${fresh.length - 1} more)` : ''}</span>
      <button className="chipbtn go" onClick={() => { done(); go('wallet'); }}>Open</button>
      <button className="linkbtn" aria-label="Close" onClick={done}>✕</button>
    </div>
  );
}
