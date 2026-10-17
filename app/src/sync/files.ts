/* Files: document scans, tickets, receipts and photos.

   Every file is kept on the phone, so it opens with no signal: in the app's own storage on the
   iPhone (never cleared by iOS), in IndexedDB in a browser. Files for a shared trip are also
   uploaded to the private trip-files bucket, under the trip's id, where only people on the trip
   can read them (see schema.sql); other phones fetch them and keep their own copy.

   Private files (IDs, passports) use paths starting "private/" and are never uploaded. */
import { Capacitor } from '@capacitor/core';
import { useEffect, useState } from 'react';
import { supabase } from './engine';
import { getState } from '../model/store';

const BUCKET = 'trip-files';
const native = Capacitor.isNativePlatform();

/* ---------- on the phone ---------- */

const toB64 = (b: Blob) => new Promise<string>((ok, bad) => {
  const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = () => bad(r.error); r.readAsDataURL(b);
});
const fromB64 = (s: string, type: string) => new Blob([Uint8Array.from(atob(s), c => c.charCodeAt(0))], { type });

let idb: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  return idb ||= new Promise((ok, bad) => {
    const r = indexedDB.open('wt-files', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => ok(r.result); r.onerror = () => bad(r.error);
  });
}
async function idbDo<T>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const d = await db();
  return new Promise((ok, bad) => { const r = f(d.transaction('files', mode).objectStore('files')); r.onsuccess = () => ok(r.result as T); r.onerror = () => bad(r.error); });
}

/* the type rides along in a small index, since the phone's file storage keeps only bytes */
const TYPES = 'wt-file-types';
const types = (): Record<string, string> => { try { return JSON.parse(localStorage.getItem(TYPES) || '{}'); } catch { return {}; } };
const setType = (path: string, type: string | null) => {
  const t = types(); if (type) t[path] = type; else delete t[path];
  try { localStorage.setItem(TYPES, JSON.stringify(t)); } catch { /* full */ }
};

export async function saveLocal(path: string, blob: Blob) {
  if (native) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    await Filesystem.writeFile({ path: 'files/' + path, data: await toB64(blob), directory: Directory.Data, recursive: true });
  } else await idbDo('readwrite', s => s.put(blob, path));
  setType(path, blob.type || 'application/octet-stream');
}

export async function readLocal(path: string): Promise<Blob | null> {
  try {
    if (native) {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const r = await Filesystem.readFile({ path: 'files/' + path, directory: Directory.Data });
      return typeof r.data === 'string' ? fromB64(r.data, types()[path] || '') : r.data;
    }
    return (await idbDo<Blob | undefined>('readonly', s => s.get(path))) || null;
  } catch { return null; }
}

export async function removeLocal(path: string) {
  try {
    if (native) {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      await Filesystem.deleteFile({ path: 'files/' + path, directory: Directory.Data });
    } else await idbDo('readwrite', s => s.delete(path));
  } catch { /* already gone */ }
  setType(path, null);
}

/* ---------- the trip's storage ---------- */

const UPLOADS = 'wt-uploads';
const pending = (): string[] => { try { return JSON.parse(localStorage.getItem(UPLOADS) || '[]'); } catch { return []; } };
const setPending = (l: string[]) => { try { localStorage.setItem(UPLOADS, JSON.stringify([...new Set(l)])); } catch { /* full */ } };

/** Keeps a file on the phone and, unless private, sends it to the trip's storage (now, or when there is signal). */
export async function keep(path: string, blob: Blob) {
  await saveLocal(path, blob);
  if (path.startsWith('private/')) return;
  setPending([...pending(), path]);
  void sendWaiting();
}

let running: Promise<void> | null = null, again = false;
/** Uploads files that were added with no signal. Files added while it runs are sent before it finishes. */
export function sendWaiting(): Promise<void> {
  if (running) { again = true; return running; }
  running = (async () => {
    try { do { again = false; await sendOnce(); } while (again); } finally { running = null; }
  })();
  return running;
}

async function sendOnce() {
  if (!navigator.onLine) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  for (const path of pending()) {
    /* a trip only on this phone has nowhere to send to yet; its files go once it is shared */
    if (!getState().sync[path.split('/')[0]]) continue;
    const blob = await readLocal(path);
    if (!blob) { setPending(pending().filter(p => p !== path)); continue; }
    const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type || undefined, upsert: false });
    /* already there counts as sent; anything else waits for the next try */
    if (!error || /exists|duplicate/i.test(error.message)) setPending(pending().filter(p => p !== path));
    else break;
  }
}

/** A file's bytes: from the phone, or fetched from the trip's storage and kept. */
export async function getFile(path: string): Promise<Blob | null> {
  const here = await readLocal(path);
  if (here || path.startsWith('private/')) return here;
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  await saveLocal(path, data).catch(() => {});
  return data;
}

/** Fetches files the phone does not have yet, so they open later with no signal. */
export async function fetchMissing(paths: string[]) {
  for (const p of paths) if (!(await readLocal(p))) await getFile(p);
}

/** Removes a file from the phone and the trip's storage. */
/** Saves a copy of a trip as a file (Files, AirDrop, email...): "Open a trip file" reads it back. */
export async function saveTripCopy(trip: { id: string; name: string }) {
  const name = `${trip.name.replace(/[^\w\s-]/g, '').trim() || 'Trip'} (WrongTrain).json`;
  const blob = new Blob([JSON.stringify({ wrongtrain: 1, trip }, null, 1)], { type: 'application/json' });
  if (native) {
    const path = `private/export-${trip.id}.json`;
    await saveLocal(path, blob);
    return openFile(path, name);
  }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export async function drop(path: string) {
  await removeLocal(path);
  setPending(pending().filter(p => p !== path));
  if (!path.startsWith('private/')) await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
}

/** An address a page can show a file at, while the component is on screen. */
export function useFileUrl(path?: string): { url: string; missing: boolean } {
  const [st, setSt] = useState({ url: '', missing: false });
  useEffect(() => {
    if (!path) return;
    let url = '', live = true;
    getFile(path).then(b => { if (!live) return; if (b) { url = URL.createObjectURL(b); setSt({ url, missing: false }); } else setSt({ url: '', missing: true }); });
    return () => { live = false; if (url) URL.revokeObjectURL(url); };
  }, [path]);
  return st;
}

/** Opens a file full screen: the share sheet's preview on the iPhone, a new tab in a browser. */
export async function openFile(path: string, name: string) {
  const b = await getFile(path);
  if (!b) throw new Error('That file is not on this phone yet. Try again with signal.');
  if (native) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const { uri } = await Filesystem.getUri({ path: 'files/' + path, directory: Directory.Data });
    await Share.share({ title: name, files: [uri] }).catch(() => {});
    return;
  }
  window.open(URL.createObjectURL(b), '_blank', 'noopener');
}

/** Shares a stored file through the phone's share sheet (Instagram, Messages, Save Image…). */
export async function sharePath(path: string, name: string, text = '') {
  const b = await getFile(path);
  if (!b) throw new Error('That photo is not on this phone yet. Try again with signal.');
  if (native) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const { uri } = await Filesystem.getUri({ path: 'files/' + path, directory: Directory.Data });
    await Share.share({ title: name, text: text || undefined, files: [uri] }).catch(() => {});
    return;
  }
  await shareBlob(b, name, text);
}

/** Shares a file made on the spot. In a browser that can't share files, it opens in a new tab. */
export async function shareBlob(b: Blob, name: string, text = '') {
  if (native) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const data = await new Promise<string>(ok => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.readAsDataURL(b); });
    const { uri } = await Filesystem.writeFile({ path: 'share/' + name, data, directory: Directory.Cache, recursive: true });
    await Share.share({ title: name, text: text || undefined, files: [uri] }).catch(() => {});
    return;
  }
  const f = new File([b], name, { type: b.type });
  if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], text: text || undefined }).catch(() => {});
  else window.open(URL.createObjectURL(b), '_blank', 'noopener');
}

/* ---------- photos ---------- */

/** A smaller JPEG: phone-screen sharp, a fraction of the size. Files that are not images pass through. */
export async function shrink(file: Blob, max = 2048, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
  try {
    const img = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(img.width, img.height));
    if (k === 1 && file.size < 1.5e6 && file.type === 'image/jpeg') return file;
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((ok, bad) => c.toBlob(b => (b ? ok(b) : bad(new Error('shrink'))), 'image/jpeg', quality));
  } catch { return file; }
}

/** When a photo was taken, from its EXIF data if it has some, else the file's date. */
export async function takenAt(file: File): Promise<string> {
  try {
    const s = new TextDecoder('latin1').decode(await file.slice(0, 128 * 1024).arrayBuffer());
    const m = /(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/.exec(s);
    if (m) return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
  } catch { /* no EXIF */ }
  return new Date(file.lastModified || Date.now()).toISOString().slice(0, 19);
}

export const extOf = (type: string, name = '') =>
  type === 'application/pdf' ? 'pdf' : type.startsWith('image/') ? (type === 'image/png' ? 'png' : 'jpg') : (/\.(\w{1,5})$/.exec(name)?.[1] || 'bin');
