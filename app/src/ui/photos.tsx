/* The day's photos, under each day: a grid of everyone's photos taken that day, a button to add
   more, and a full-screen viewer. See sync/photos.ts. */
import { useState } from 'react';
import type { Day } from '../model/types';
import { canDecide } from '../model/rules';
import { getState, useStore } from '../model/store';
import { stamp } from '../model/time';
import { openFile, useFileUrl } from '../sync/files';
import { addPhotos, deletePhoto, usePhotos, type Photo } from '../sync/photos';
import { useSync } from '../sync/engine';
import { SecH } from './bits';
import { useApp } from './ctx';

export function DayPhotos({ d }: { d: Day }) {
  const { ix, edit } = useApp();
  const shared = !!useStore().sync[ix.trip.id];
  const { session } = useSync();
  const all = usePhotos(ix.trip.id), mine = all.filter(p => p.day_id === d.id);
  const [busy, setBusy] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const add = async (files: File[]) => {
    if (!files.length) return;
    setBusy(`Adding 0 of ${files.length}…`);
    try { await addPhotos(ix.trip, files, d.id, n => setBusy(`Adding ${n} of ${files.length}…`)); setBusy(''); }
    catch { setBusy('Some photos could not be added.'); }
  };
  if (ix.trip.sample) return null;
  return (
    <section className="sec" id="photos">
      <SecH title="Photos"><span className="kicker">{mine.length || ''}</span></SecH>
      {!shared || !session ? (
        <p className="note">Share this trip and everyone on it can add photos here and see each other's.{' '}
          <button className="linkbtn" onClick={() => edit({ kind: 'trip' })}>{shared ? 'Sign in' : 'Share it'}</button></p>
      ) : (
        <>
          {mine.length > 0 && (
            <div className="pgrid">{mine.map((p, i) => <Thumb key={p.id} p={p} onOpen={() => setOpen(i)} />)}</div>
          )}
          <label className="chipbtn filepick" style={{ marginTop: 10 }}>
            + Add photos
            <input type="file" accept="image/*" multiple hidden onChange={e => { const f = [...(e.target.files || [])]; e.target.value = ''; void add(f); }} />
          </label>
          {busy && <p className="geomsg" role="status">{busy}</p>}
          {!mine.length && !busy && <p className="note">Photos taken on this day show here, for everyone on the trip.</p>}
        </>
      )}
      {open != null && mine[open] && <Viewer list={mine} at={open} onMove={setOpen} onClose={() => setOpen(null)} />}
    </section>
  );
}

function Thumb({ p, onOpen }: { p: Photo; onOpen: () => void }) {
  const { url } = useFileUrl(p.thumb);
  return (
    <button className="pthumb" onClick={onOpen} aria-label={`Photo by ${p.author_name || 'someone'}`}>
      {url ? <img src={url} alt="" loading="lazy" /> : <span />}
      {p.local && <i className="pwait">Waiting</i>}
    </button>
  );
}

function Viewer({ list, at, onMove, onClose }: { list: Photo[]; at: number; onMove: (i: number) => void; onClose: () => void }) {
  const p = list[at];
  const { url, missing } = useFileUrl(p.path);
  const { session } = useSync();
  const role = getState().sync[p.trip_id]?.role;
  const canDelete = p.local || p.user_id === session?.user.id || (role && canDecide(role));
  const [msg, setMsg] = useState('');
  return (
    <div className="pview" role="dialog" aria-label="Photo">
      <div className="pview-bar">
        <button className="linkbtn" onClick={onClose}>Close</button>
        <span>{at + 1} of {list.length}</span>
        <button className="linkbtn" onClick={() => openFile(p.path, 'photo.jpg').catch(e => setMsg((e as Error).message))}>Save or share</button>
      </div>
      <div className="pview-img"
        onTouchStart={e => { (e.currentTarget as HTMLElement).dataset.x = String(e.touches[0].clientX); }}
        onTouchEnd={e => { const dx = e.changedTouches[0].clientX - Number((e.currentTarget as HTMLElement).dataset.x || 0); if (Math.abs(dx) > 60) onMove(Math.min(list.length - 1, Math.max(0, at + (dx < 0 ? 1 : -1)))); }}>
        {url ? <img src={url} alt="" /> : <p className="geomsg">{missing ? 'This photo needs signal to open the first time.' : 'Loading…'}</p>}
      </div>
      <div className="pview-foot">
        <span>{p.author_name || 'Someone'}{p.taken_at ? ` · ${stamp(p.taken_at)}` : ''}{p.local ? ' · waiting for signal' : ''}</span>
        <span className="grow" />
        {at > 0 && <button className="linkbtn" onClick={() => onMove(at - 1)}>‹ Previous</button>}
        {at < list.length - 1 && <button className="linkbtn" onClick={() => onMove(at + 1)}>Next ›</button>}
      </div>
      {canDelete && <div className="pview-foot"><button className="linkbtn bad" onClick={async () => {
        if (!confirm('Delete this photo for everyone?')) return;
        try { await deletePhoto(p); if (list.length <= 1) onClose(); else onMove(Math.max(0, at - 1)); } catch (e) { setMsg((e as Error).message); }
      }}>Delete</button></div>}
      {msg && <p className="geomsg bad">{msg}</p>}
    </div>
  );
}
