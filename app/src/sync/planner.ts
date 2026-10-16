/* Talks to the plan-trip function (supabase/functions/plan-trip) for "Plan it for me", and keeps
   the plan in progress on the phone, so closing the app halfway loses nothing. */
import type { Answers, Outline, StopPlan } from '../../supabase/functions/_shared/planner.ts';
import { supabase } from './engine';

export interface Draft {
  answers: Answers;
  planId?: string;
  outline?: Outline;
  /** One per stop: its plan, once filled in. */
  stops?: (StopPlan | null)[];
  left?: number;
}

const KEY = 'wt-plan-draft';
export const loadDraft = (): Draft | null => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };
export const saveDraft = (d: Draft | null) => { try { if (d) localStorage.setItem(KEY, JSON.stringify(d)); else localStorage.removeItem(KEY); } catch { /* full */ } };

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>('plan-trip', { body });
  if (!error && data) return data;
  const res = (error as { context?: Response })?.context;
  if (res?.status === 404) throw new Error('Planning is not set up yet.');
  let message = '';
  if (res && typeof res.json === 'function') { try { message = ((await res.clone().json()) as { message?: string }).message || ''; } catch { /* not JSON */ } }
  if (message) throw new Error(message);
  if (/failed to (send|fetch)|network/i.test((error as Error)?.message || '')) throw new Error('No connection. Try again when you have signal.');
  throw new Error('Claude could not plan that just now. Try again.');
}

export const makeOutline = (answers: Answers) => call<{ plan_id: string; left: number; outline: Outline }>({ step: 'outline', answers });

export type StopState = 'waiting' | 'research' | 'build' | 'done' | 'failed';

/** Fills in one stop: research on the web, then the plan. */
export async function fillStop(d: Draft, index: number, onState: (s: StopState) => void): Promise<StopPlan> {
  const base = { plan_id: d.planId, answers: d.answers, outline: d.outline, index };
  onState('research');
  const { notes } = await call<{ notes: string }>({ ...base, step: 'research' });
  onState('build');
  const { stop } = await call<{ stop: StopPlan }>({ ...base, step: 'build', notes });
  onState('done');
  return stop;
}
