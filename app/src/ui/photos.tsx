/* Photos: the Photos page (everyone's photos from the trip, by day or by person), the photos
   under each day, and the full-screen viewer, where people heart, comment and share a photo to
   anywhere the phone can (Instagram, Messages, saving it). See sync/photos.ts. */
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Day, Trip } from '../model/types';
import { canDecide } from '../model/rules';
import { getState, useStore } from '../model/store';
import { longDate, stamp } from '../model/time';
import { shareBlob, sharePath, useFileUrl } from '../sync/files';
import { type Comment, addComment, addPhotos, deleteComment, deletePhoto, refresh, seedSampleTalk, toggleHeart, usePhotos, useTalk, type Photo, type Talk } from '../sync/photos';
import { useSync } from '../sync/engine';
import { SecH } from './bits';
import { useApp } from './ctx';
import { Avatar, useAvatarFor } from './avatar';
import { SAMPLE_PEOPLE, SAMPLE_PHOTOS } from '../model/sample';

/* ---------- the sample's photos, as ordinary photos ---------- */

function samplePhotos(t: Trip): Photo[] {
  return SAMPLE_PHOTOS.map((x, i) => ({
    id: `sample-${i}`, trip_id: t.id, user_id: null, author_name: x.by, path: '', thumb: '', caption: x.caption,
    taken_at: `${t.days.find(d => d.id === x.day)?.date || ''}T${String(9 + i * 2).padStart(2, '0')}:30:00`, day_id: x.day, src: x.src,
  }));
}
const SAMPLE_TALK = (ps: Photo[]): Talk => ({
  hearts: [
    ...['Alex', 'Jordan', 'Riley'].map(n => ({ photo_id: ps[0]?.id, user_id: n, author_name: n })),
    ...['Sam', 'Alex'].map(n => ({ photo_id: ps[1]?.id, user_id: n, author_name: n })),
    ...['Sam', 'Jordan', 'Alex', 'Riley'].map(n => ({ photo_id: ps[3]?.id, user_id: n, author_name: n })),
  ].filter(h => h.photo_id),
  comments: [
    { id: 'sc1', photo_id: ps[1]?.id, user_id: 'Sam', author_name: 'Sam', text: 'Worth the 6 AM alarm', created_at: '2026-01-01T08:00:00Z' },
    { id: 'sc2', photo_id: ps[3]?.id, user_id: 'Alex', author_name: 'Alex', text: 'He wanted your crackers', created_at: '2026-01-01T09:00:00Z' },
    { id: 'sc3', photo_id: ps[3]?.id, user_id: 'Jordan', author_name: 'Jordan', text: 'Best photo of the trip', created_at: '2026-01-01T09:05:00Z' },
  ].filter(c => c.photo_id),
});

/** The trip's photos (the sample's drawings on the sample), and who you are for hearts and comments. */
function useTripPhotos() {
  const { ix } = useApp();
  const t = ix.trip;
  const real = usePhotos(t.id);
  const sample = useMemo(() => (t.sample ? samplePhotos(t) : null), [t]);
  useEffect(() => { if (sample) seedSampleTalk(t.id, SAMPLE_TALK(sample)); }, [sample, t.id]);
  const { session } = useSync();
  const me = { id: session?.user.id || 'me', name: getState().me || 'Me' };
  return { list: sample || real, me, sample: !!sample };
}

/* ---------- the Photos page ---------- */

export function PhotosPage() {
  const { ix, edit } = useApp();
  const t = ix.trip;
  const shared = !!useStore().sync[t.id];
  const { session } = useSync();
  const { list, me, sample } = useTripPhotos();
  const talk = useTalk(t.id);
  const [by, setBy] = useState<'day' | 'person'>('day');
  const [open, setOpen] = useState<{ list: Photo[]; at: number } | null>(null);
  const [busy, setBusy] = useState('');
  /* keep it fresh while the page is open */
  useEffect(() => {
    if (sample || !shared) return;
    const tick = window.setInterval(() => { if (!document.hidden) void refresh(t.id); }, 30_000);
    return () => clearInterval(tick);
  }, [t.id, shared, sample]);
  const add = async (files: File[]) => {
    if (!files.length) return;
    setBusy(`Adding 0 of ${files.length}…`);
    try { await addPhotos(t, files, undefined, n => setBusy(`Adding ${n} of ${files.length}…`)); setBusy(''); }
    catch { setBusy('Some photos could not be added.'); }
  };
  const groups = useMemo(() => {
    if (by === 'person') {
      const m = new Map<string, Photo[]>();
      for (const p of list) { const k = p.author_name || 'Someone'; m.set(k, [...(m.get(k) || []), p]); }
      return [...m].sort((a, b) => b[1].length - a[1].length).map(([k, ps]) => ({ key: k, title: k, person: k, ps }));
    }
    const out: { key: string; title: string; person?: string; ps: Photo[] }[] = [];
    for (const d of t.days) { const ps = list.filter(p => p.day_id === d.id); if (ps.length) out.push({ key: d.id, title: longDate(d.date), ps }); }
    const loose = list.filter(p => !t.days.some(d => d.id === p.day_id));
    if (loose.length) out.push({ key: 'other', title: 'Other days', ps: loose });
    return out;
  }, [by, list, t.days]);
  const hearts = (p: Photo) => talk.hearts.filter(h => h.photo_id === p.id).length;
  const canAdd = !sample && shared && !!session;

  return (
    <>
      <h1 className="page-h">Photos</h1>
      <p className="note" style={{ marginTop: 0 }}>Everyone's photos from the trip, in one place. Tap one to heart it, comment or share it.</p>
      {!sample && (!shared || !session) && (
        <p className="note">Share this trip and everyone on it can add photos here and see each other's.{' '}
          <button className="linkbtn" onClick={() => edit({ kind: 'trip' })}>{shared ? 'Sign in' : 'Share it'}</button></p>
      )}
      {canAdd && (
        <label className="chipbtn go filepick">
          + Add photos
          <input type="file" accept="image/*" multiple hidden onChange={e => { const f = [...(e.target.files || [])]; e.target.value = ''; void add(f); }} />
        </label>
      )}
      {busy && <p className="geomsg" role="status">{busy}</p>}
      {list.length > 0 && (
        <div className="chips" role="group" aria-label="Show photos" style={{ marginTop: 12 }}>
          <button className={'chipbtn' + (by === 'day' ? ' on' : '')} aria-pressed={by === 'day'} onClick={() => setBy('day')}>By day</button>
          <button className={'chipbtn' + (by === 'person' ? ' on' : '')} aria-pressed={by === 'person'} onClick={() => setBy('person')}>By person</button>
        </div>
      )}
      {groups.map(g => (
        <section key={g.key} className="sec">
          <SecH title={g.title}><span className="kicker">{g.ps.length}</span></SecH>
          <div className="pgrid">{g.ps.map((p, i) => <Thumb key={p.id} p={p} hearts={hearts(p)} onOpen={() => setOpen({ list: g.ps, at: i })} />)}</div>
        </section>
      ))}
      {!list.length && canAdd && !busy && <p className="note">No photos yet. Add some, and everyone on the trip sees them here and under each day.</p>}
      {sample && <p className="note">In the sample, the photos are drawings and the hearts and comments stay on this phone.</p>}
      {open && open.list[open.at] && <Viewer list={open.list} at={open.at} me={me} onMove={i => setOpen({ ...open, at: i })} onClose={() => setOpen(null)} />}
    </>
  );
}

/* ---------- the photos under each day ---------- */

export function DayPhotos({ d }: { d: Day }) {
  const { ix, edit } = useApp();
  const shared = !!useStore().sync[ix.trip.id];
  const { session } = useSync();
  const { list, me, sample } = useTripPhotos();
  const talk = useTalk(ix.trip.id);
  const mine = list.filter(p => p.day_id === d.id);
  const [busy, setBusy] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const add = async (files: File[]) => {
    if (!files.length) return;
    setBusy(`Adding 0 of ${files.length}…`);
    try { await addPhotos(ix.trip, files, d.id, n => setBusy(`Adding ${n} of ${files.length}…`)); setBusy(''); }
    catch { setBusy('Some photos could not be added.'); }
  };
  if (sample && !mine.length) return null;
  return (
    <section className="sec" id="photos">
      <SecH title="Photos"><span className="kicker">{mine.length || ''}</span></SecH>
      {!sample && (!shared || !session) ? (
        <p className="note">Share this trip and everyone on it can add photos here and see each other's.{' '}
          <button className="linkbtn" onClick={() => edit({ kind: 'trip' })}>{shared ? 'Sign in' : 'Share it'}</button></p>
      ) : (
        <>
          {mine.length > 0 && (
            <div className="pgrid">{mine.map((p, i) => <Thumb key={p.id} p={p} hearts={talk.hearts.filter(h => h.photo_id === p.id).length} onOpen={() => setOpen(i)} />)}</div>
          )}
          {!sample && (
            <label className="chipbtn filepick" style={{ marginTop: 10 }}>
              + Add photos
              <input type="file" accept="image/*" multiple hidden onChange={e => { const f = [...(e.target.files || [])]; e.target.value = ''; void add(f); }} />
            </label>
          )}
          {busy && <p className="geomsg" role="status">{busy}</p>}
          {!mine.length && !busy && <p className="note">Photos taken on this day show here, for everyone on the trip.</p>}
        </>
      )}
      {open != null && mine[open] && <Viewer list={mine} at={open} me={me} onMove={setOpen} onClose={() => setOpen(null)} />}
    </section>
  );
}

function Thumb({ p, hearts, onOpen }: { p: Photo; hearts: number; onOpen: () => void }) {
  const { url } = useFileUrl(p.src ? '' : p.thumb);
  const src = p.src || url;
  const face = useAvatarFor(p.trip_id, p.author_name) || SAMPLE_PEOPLE.find(q => q.name === p.author_name)?.avatar;
  return (
    <button className="pthumb" onClick={onOpen} aria-label={`Photo by ${p.author_name || 'someone'}${hearts ? `, ${hearts} hearts` : ''}`}>
      {src ? <img src={src} alt="" loading="lazy" /> : <span />}
      <i className="pby"><Avatar name={p.author_name || '?'} src={face} size={22} /></i>
      {hearts > 0 && <i className="phearts">♥ {hearts}</i>}
      {p.local && <i className="pwait">Waiting</i>}
    </button>
  );
}

/* ---------- the viewer ---------- */

function Viewer({ list, at, me, onMove, onClose }: { list: Photo[]; at: number; me: { id: string; name: string }; onMove: (i: number) => void; onClose: () => void }) {
  const p = list[at];
  const { url, missing } = useFileUrl(p.src ? '' : p.path);
  const src = p.src || url;
  const { session } = useSync();
  const talk = useTalk(p.trip_id);
  const role = getState().sync[p.trip_id]?.role;
  const canDelete = !p.src && (p.local || p.user_id === session?.user.id || (role && canDecide(role)));
  const hearts = talk.hearts.filter(h => h.photo_id === p.id), hearted = hearts.some(h => h.user_id === me.id);
  const comments = talk.comments.filter(c => c.photo_id === p.id);
  const [msg, setMsg] = useState('');
  const [talking, setTalking] = useState(false);
  const [draft, setDraft] = useState('');
  const face = (name: string) => SAMPLE_PEOPLE.find(q => q.name === name)?.avatar;
  const share = async () => {
    setMsg('');
    try {
      if (p.src) await shareBlob(await (await fetch(p.src)).blob(), p.src.split('/').pop() || 'photo.svg', p.caption || '');
      else await sharePath(p.path, 'photo.jpg', p.caption || '');
    } catch (e) { setMsg((e as Error).message); }
  };
  const send = async () => {
    if (!draft.trim()) return;
    try { await addComment(p, draft, me); setDraft(''); setMsg(''); } catch (e) { setMsg((e as Error).message); }
  };
  /* on top of everything, the bottom bar included: inside a page it would sit under the bar */
  return createPortal(
    <div className="pview" role="dialog" aria-label="Photo">
      <div className="pview-bar">
        <button className="linkbtn" onClick={onClose}>Close</button>
        <span>{at + 1} of {list.length}</span>
        <button className="linkbtn" onClick={() => void share()}>Share</button>
      </div>
      <div className="pview-img"
        onTouchStart={e => { (e.currentTarget as HTMLElement).dataset.x = String(e.touches[0].clientX); }}
        onTouchEnd={e => { const dx = e.changedTouches[0].clientX - Number((e.currentTarget as HTMLElement).dataset.x || 0); if (Math.abs(dx) > 60) onMove(Math.min(list.length - 1, Math.max(0, at + (dx < 0 ? 1 : -1)))); }}
        onDoubleClick={() => { if (!hearted) void toggleHeart(p, me).catch(e => setMsg((e as Error).message)); }}>
        {src ? <img src={src} alt={p.caption || ''} /> : <p className="geomsg">{missing ? 'This photo needs signal to open the first time.' : 'Loading…'}</p>}
      </div>
      <div className="pview-who">
        <Avatar name={p.author_name || '?'} src={useAvatarFor(p.trip_id, p.author_name) || face(p.author_name)} size={28} />
        <div><b>{p.author_name || 'Someone'}</b><small>{p.taken_at ? stamp(p.taken_at) : ''}{p.local ? ' · waiting for signal' : ''}</small>{p.caption && <span>{p.caption}</span>}</div>
      </div>
      <div className="pview-acts">
        <button className={'pact' + (hearted ? ' on' : '')} aria-pressed={hearted} aria-label={hearted ? 'Take back your heart' : 'Heart this photo'}
          onClick={() => void toggleHeart(p, me).catch(e => setMsg((e as Error).message))}>
          <span aria-hidden="true">{hearted ? '♥' : '♡'}</span> {hearts.length || ''}
        </button>
        <button className={'pact' + (talking ? ' on' : '')} aria-expanded={talking} onClick={() => setTalking(!talking)}>
          <span aria-hidden="true">💬</span> {comments.length ? `${comments.length} comment${comments.length > 1 ? 's' : ''}` : 'Comment'}
        </button>
        <span className="grow" />
        {at > 0 && <button className="linkbtn" onClick={() => onMove(at - 1)} aria-label="Previous photo">‹</button>}
        {at < list.length - 1 && <button className="linkbtn" onClick={() => onMove(at + 1)} aria-label="Next photo">›</button>}
      </div>
      {hearts.length > 0 && <p className="pview-liked">♥ {hearts.map(h => (h.user_id === me.id ? 'You' : h.author_name || 'Someone')).join(', ')}</p>}
      {talking && (
        <div className="pview-talk">
          {comments.map(c => (
            <CommentRow key={c.id} c={c} tripId={p.trip_id} mine={c.user_id === me.id}
              canRemove={c.user_id === me.id || (!!role && canDecide(role))}
              onRemove={() => void deleteComment(p.trip_id, c, !!p.src).catch(e => setMsg((e as Error).message))} />
          ))}
          <div className="pcomment-new">
            <input value={draft} maxLength={500} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void send(); }}
              placeholder="Add a comment" aria-label="Your comment" />
            <button className="linkbtn" onClick={() => void send()} disabled={!draft.trim()}>Post</button>
          </div>
        </div>
      )}
      {canDelete && <div className="pview-foot"><button className="linkbtn bad" onClick={async () => {
        if (!confirm('Delete this photo for everyone?')) return;
        try { await deletePhoto(p); if (list.length <= 1) onClose(); else onMove(Math.max(0, at - 1)); } catch (e) { setMsg((e as Error).message); }
      }}>Delete photo</button></div>}
      {msg && <p className="geomsg bad" style={{ margin: '0 16px 10px' }}>{msg}</p>}
    </div>,
    document.body,
  );
}

function CommentRow({ c, tripId, mine, canRemove, onRemove }: { c: Comment; tripId: string; mine: boolean; canRemove: boolean; onRemove: () => void }) {
  const face = useAvatarFor(tripId, c.author_name) || SAMPLE_PEOPLE.find(q => q.name === c.author_name)?.avatar;
  return (
    <div className="pcomment">
      <Avatar name={c.author_name || '?'} src={face} size={22} />
      <p><b>{mine ? 'You' : c.author_name || 'Someone'}</b> {c.text}</p>
      {canRemove && <button className="linkbtn" aria-label="Delete comment" onClick={onRemove}>✕</button>}
    </div>
  );
}
