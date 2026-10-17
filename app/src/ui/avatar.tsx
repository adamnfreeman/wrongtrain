/* Profile pictures. Yours is chosen on Account & settings, cropped to a square and shrunk on the
   phone to a small JPEG (about 15 KB), and kept on the phone; when you're signed in it also goes
   on every trip you're on (trip_members.avatar), where only the people on that trip can see it.
   Without a picture, a circle with your initials stands in. */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { pref, setPref, getState } from '../model/store';
import { members, setMyAvatar, useSync, type Member } from '../sync/engine';

/* ---------- yours ---------- */

const KEY = 'avatar';
const listeners = new Set<() => void>();
let mine: string | null = pref<string | null>(KEY, null);

export const useMyAvatar = () => useSyncExternalStore(f => { listeners.add(f); return () => listeners.delete(f); }, () => mine);

/** Sets (or, with null, removes) your picture on this phone and on your trips. */
export async function saveMyAvatar(a: string | null) {
  mine = a; setPref(KEY, a); listeners.forEach(f => f());
  await setMyAvatar(a);
}
export const myAvatar = () => mine;

/** A photo from the phone, as a small square JPEG data URL: the middle of it, 192 px across. */
export async function makeAvatar(file: Blob): Promise<string> {
  const img = await createImageBitmap(file);
  const side = Math.min(img.width, img.height), size = 192;
  const c = document.createElement('canvas'); c.width = c.height = size;
  c.getContext('2d')!.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
  img.close?.();
  for (const q of [0.82, 0.7, 0.55]) {
    const url = c.toDataURL('image/jpeg', q);
    if (url.length < 55000) return url;
  }
  throw new Error('That picture is too detailed to use. Try another.');
}

/* ---------- everyone on a trip ---------- */

const cacheKey = (id: string) => 'wt-people-' + id;
const cached = (id: string): Member[] => { try { return JSON.parse(localStorage.getItem(cacheKey(id)) || '[]'); } catch { return []; } };

/* one request per trip a minute, however many notes and lists ask for it */
const asked = new Map<string, { at: number; p: Promise<Member[]> }>();
function peopleOnce(id: string): Promise<Member[]> {
  const a = asked.get(id);
  if (a && Date.now() - a.at < 60_000) return a.p;
  const p = members(id); asked.set(id, { at: Date.now(), p });
  p.catch(() => asked.delete(id));
  return p;
}

/** The people on a shared trip, with their pictures; kept on the phone for when there's no signal. */
export function useTripPeople(tripId: string): Member[] {
  const { session } = useSync();
  const shared = !!getState().sync[tripId];
  const [people, setPeople] = useState<Member[]>(() => cached(tripId));
  useEffect(() => {
    if (!shared || !session) return;
    let live = true;
    peopleOnce(tripId).then(m => {
      if (!live) return;
      setPeople(m);
      try { localStorage.setItem(cacheKey(tripId), JSON.stringify(m)); } catch { /* full: show without */ }
    }).catch(() => {});
    return () => { live = false; };
  }, [tripId, shared, session]);
  return people;
}

/** The picture for a name on a trip: yours if it's your name, else whoever on the trip has it. */
export function useAvatarFor(tripId: string, name: string): string | null {
  const people = useTripPeople(tripId), me = useMyAvatar(), myName = getState().me;
  const n = name.trim().toLowerCase();
  if (me && n && n === (myName || '').trim().toLowerCase()) return me;
  return (n && people.find(p => (p.name || '').trim().toLowerCase() === n)?.avatar) || null;
}

/* ---------- the circle ---------- */

const HUES = [12, 38, 152, 190, 222, 262, 300, 340];
const hue = (s: string) => HUES[[...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % HUES.length];
const initials = (s: string) => s.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?';

export function Avatar({ name, src, size = 28 }: { name: string; src?: string | null; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.4), ['--av' as string]: `${hue(name || '?')}` };
  return src
    ? <img className="avatar" src={src} alt="" style={style} />
    : <span className="avatar initials" aria-hidden="true" style={style}>{initials(name)}</span>;
}
