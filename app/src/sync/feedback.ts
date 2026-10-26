/* Comments about the app, sent from the Notes tab to Adam (app_feedback in schema.sql): what's
   broken, ideas, what to change, with the build number and the kind of phone, so a report can be
   matched to a build. */
import { getState } from '../model/store';
import { supabase } from './engine';
import { shrink } from './files';

export type FeedbackKind = 'broken' | 'idea' | 'change';
export interface Feedback { id: string; kind: FeedbackKind; text: string; created_at: string; image?: string | null }

/** Sends a comment, with a screenshot when one is given (shrunk on the phone, kept in the private
    feedback bucket under your account; Adam opens it from the row's image path in Storage). */
export async function sendFeedback(kind: FeedbackKind, text: string, shot?: Blob | null) {
  const clean = text.trim().slice(0, 2000);
  if (!clean) return;
  if (!navigator.onLine) throw new Error('No signal. Your words are still in the box; send them when you have signal.');
  let image: string | undefined;
  if (shot) {
    const { data: s } = await supabase.auth.getSession();
    const path = `${s.session?.user.id}/${Date.now().toString(36)}.jpg`;
    const { error } = await supabase.storage.from('feedback').upload(path, await shrink(shot, 1600), { contentType: 'image/jpeg' });
    if (error) throw new Error("Couldn't send the screenshot. Try again, or send it without one.");
    image = path;
  }
  const { error } = await supabase.from('app_feedback').insert({
    kind, text: clean, name: (getState().me || '').slice(0, 80),
    build: String(__BUILD__.n || '?').slice(0, 40), device: navigator.userAgent.slice(0, 200), ...(image ? { image } : {}),
  });
  if (error) throw error;
}

export async function myFeedback(): Promise<Feedback[]> {
  const { data } = await supabase.from('app_feedback').select('*').order('created_at', { ascending: false }).limit(20);
  return (data || []) as Feedback[];
}
