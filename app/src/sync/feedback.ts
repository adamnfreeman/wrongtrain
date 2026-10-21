/* Comments about the app, sent from the Notes tab to Adam (app_feedback in schema.sql): what's
   broken, ideas, what to change, with the build number and the kind of phone, so a report can be
   matched to a build. */
import { getState } from '../model/store';
import { supabase } from './engine';

export type FeedbackKind = 'broken' | 'idea' | 'change';
export interface Feedback { id: string; kind: FeedbackKind; text: string; created_at: string }

export async function sendFeedback(kind: FeedbackKind, text: string) {
  const clean = text.trim().slice(0, 2000);
  if (!clean) return;
  if (!navigator.onLine) throw new Error('No signal. Your words are still in the box; send them when you have signal.');
  const { error } = await supabase.from('app_feedback').insert({
    kind, text: clean, name: (getState().me || '').slice(0, 80),
    build: String(__BUILD__.n || '?').slice(0, 40), device: navigator.userAgent.slice(0, 200),
  });
  if (error) throw error;
}

export async function myFeedback(): Promise<Feedback[]> {
  const { data } = await supabase.from('app_feedback').select('id, kind, text, created_at').order('created_at', { ascending: false }).limit(20);
  return (data || []) as Feedback[];
}
