/* Your own notes (the Notes tab) on all your devices: kept on the phone first, and, signed in, in
   my_notes (schema.sql), one row per trip that only you can see. The newer copy wins: it's one
   person's notes, so two phones rarely write at once. */
import { supabase } from './engine';
import { pref, setPref } from '../model/store';

const textKey = (id: string) => 'mynotes-' + id, atKey = (id: string) => 'mynotes-at-' + id;

/** What's on this phone. */
export const localNotes = (id: string) => pref(textKey(id), '');

/** Typed here: kept on the phone, stamped, so a newer copy elsewhere can be told apart. */
export function keepNotes(id: string, text: string) {
  setPref(textKey(id), text);
  setPref(atKey(id), new Date().toISOString());
}

/** The account's copy, when it's newer than this phone's; it then replaces this phone's. */
export async function pullNotes(id: string): Promise<string | null> {
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return null;
  const { data, error } = await supabase.from('my_notes').select('text, updated_at').eq('trip_id', id).maybeSingle();
  if (error) return null;
  const local = localNotes(id), at = pref(atKey(id), '');
  /* notes written on this phone before they synced: kept, never overwritten. Added to the account's
     copy (or made the account's copy), so nothing typed on any device is lost the first time. */
  if (!at && local.trim()) {
    const both = !data?.text ? local : data.text.includes(local) ? data.text : `${data.text}\n\n${local}`;
    keepNotes(id, both);
    await pushNotes(id);
    return both === local ? null : both;
  }
  if (!data || data.updated_at <= at) return null;
  setPref(textKey(id), data.text);
  setPref(atKey(id), data.updated_at);
  return data.text as string;
}

/** This phone's copy to the account (signed in only; quietly tried again on the next change). */
export async function pushNotes(id: string) {
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) return;
  await supabase.from('my_notes').upsert({ trip_id: id, text: localNotes(id), updated_at: pref(atKey(id), new Date().toISOString()) })
    .then(() => {}, () => {});
}
