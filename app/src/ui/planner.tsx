/* "Plan it for me": a few questions, then Claude proposes the cities and nights, which you can
   change, then fills in each city (hotels, food, sights, the days) and it becomes a normal trip.
   See supabase/functions/_shared/planner.ts and src/model/planner.ts. */
import { useEffect, useRef, useState } from 'react';
import { addTrip, getState } from '../model/store';
import { SayPicker } from './requests';
import { planToTrip } from '../model/planner';
import { longDate } from '../model/time';
import {
  DAY_STYLES, DIETS, PACES, STYLES, VIBES, blankAnswers, dollars, stopDates,
  type Answers, type Outline,
} from '../../supabase/functions/_shared/planner.ts';
import { canTest, fillStop, isTestMode, loadDraft, makeOutline, rememberPlan, saveDraft, savedPlan, setTestMode, type Draft, type StopState } from '../sync/planner';
import { Check } from './form';
import { isSignedIn } from '../sync/engine';
import { SignInSheet } from './account';
import { PlanningScreen } from './planning';
import { Sheet, Text } from './form';

type Step = 'where' | 'who' | 'style' | 'outline' | 'fill';

export function PlannerSheet({ close }: { close: () => void }) {
  const [draft, setDraftState] = useState<Draft>(() => loadDraft() || { answers: { ...blankAnswers(), travelers: [{ name: getState().me, from: '' }] } });
  const [step, setStep] = useState<Step>(() => (draft.stops ? 'fill' : draft.outline ? 'outline' : 'where'));
  /* how much say everyone gets; it goes on the trip, not to the planner */
  const [say, setSay] = useState<'open' | 'approve' | 'look'>('open');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [signIn, setSignIn] = useState(false);
  const [states, setStates] = useState<StopState[]>(() => (draft.stops || []).map(s => (s ? 'done' : 'waiting')));
  const set = (d: Draft) => { setDraftState(d); saveDraft(d); };
  const a = draft.answers, up = (p: Partial<Answers>) => set({ ...draft, answers: { ...a, ...p } });

  const [test, setTest] = useState(isTestMode);
  const plan = async () => {
    if (!test && !isSignedIn()) return setSignIn(true);
    setBusy(true); setMsg('');
    try {
      const r = await makeOutline(a);
      set({ ...draft, planId: r.plan_id, outline: r.outline, left: r.left, stops: undefined });
      setStep('outline');
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  };

  /* fill in every stop, three at a time; once at a time, however it is started */
  const filling = useRef(false);
  const fill = async (d: Draft) => {
    if (filling.current) return;
    filling.current = true;
    const o = d.outline!, results = d.stops ? [...d.stops] : o.stops.map(() => null);
    const st: StopState[] = results.map(r => (r ? 'done' : 'waiting'));
    setStates([...st]); setStep('fill'); setMsg('');
    const todo = o.stops.map((_, i) => i).filter(i => !results[i]);
    const work = async () => {
      for (let i = todo.shift(); i != null; i = todo.shift()) {
        try {
          results[i] = await fillStop(d, i, s => { st[i] = s; setStates([...st]); });
          set({ ...d, stops: [...results] });
        } catch (e) { st[i] = 'failed'; setStates([...st]); setMsg((e as Error).message); }
      }
    };
    await Promise.all([work(), work(), work()]);
    set({ ...d, stops: [...results] });
    filling.current = false;
  };

  /* reopened partway through (the app was closed or updated): carry on with what is left */
  useEffect(() => {
    if (step === 'fill' && draft.outline && draft.stops && draft.stops.some(x => !x)) void fill(draft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const make = () => {
    const t = planToTrip(a, draft.outline!, draft.stops || []);
    if (draft.planId !== 'test') rememberPlan(draft);
    addTrip({ ...t, say }); saveDraft(null); close();
  };

  if (signIn) return <SignInSheet close={() => setSignIn(false)} then={() => void plan()} why="Sign in so WrongTrain can plan your trip. Planning is free for your first few trips." />;

  const next: Record<Step, { label: string; go: () => void; ok: boolean }> = {
    where: { label: 'Next', go: () => setStep('who'), ok: !!a.where.trim() },
    who: { label: 'Next', go: () => setStep('style'), ok: true },
    style: { label: busy ? '…' : 'Plan it', go: () => void plan(), ok: !busy },
    outline: { label: 'Fill it in', go: () => void fill(draft), ok: !!draft.outline?.stops.length },
    fill: { label: 'Make the trip', go: make, ok: states.length > 0 && states.every(s => s === 'done' || s === 'failed') && states.some(s => s === 'done') },
  };
  const back: Partial<Record<Step, Step>> = { who: 'where', style: 'who', outline: 'style' };

  return (
    <Sheet title="Plan it for me" onCancel={close} onSave={next[step].go} saveLabel={next[step].label} canSave={next[step].ok}>
      {back[step] && <button type="button" className="linkbtn" onClick={() => setStep(back[step]!)}>‹ Back</button>}
      {test && step !== 'fill' && <p className="testbanner">Test mode: replays “{savedPlan().outline.title}”. No charge.</p>}
      {step === 'where' && <Where a={a} up={up} />}
      {step === 'who' && <><Who a={a} up={up} /><SayPicker value={say} onChange={setSay} /></>}
      {step === 'style' && <Style a={a} up={up} />}
      {step === 'style' && busy && <PlanningScreen answers={a} />}
      {step === 'outline' && draft.outline && <OutlineView o={draft.outline} days={a.days} left={draft.left} onChange={o => set({ ...draft, outline: o, stops: undefined })} />}
      {step === 'fill' && draft.outline && states.some(s => s === 'research' || s === 'build' || s === 'waiting') && <PlanningScreen answers={a} title={draft.outline.title} city={draft.outline.stops[0]?.city}>
        <ul className="planning-progress">{draft.outline.stops.map((c, i) => (
          <li key={i} className={states[i]}><b>{c.city}</b> {states[i] === 'done' ? 'ready' : states[i] === 'failed' ? 'did not work' : states[i] === 'research' ? 'finding hotels, food and sights' : states[i] === 'build' ? 'planning the days' : 'waiting'}</li>
        ))}</ul>
      </PlanningScreen>}
      {step === 'fill' && draft.outline && <Filling o={draft.outline} states={states} onRetry={() => void fill(draft)} />}
      {msg && <p className="geomsg bad" role="alert">{msg}</p>}
      {step === 'where' && canTest && <Check label="Test mode" checked={test} onChange={v => { setTest(v); setTestMode(v); }}
        hint="Replays the last plan made on this phone instead of planning a new one. Free and quick, for trying things out." />}
      {step === 'where' && draft.outline && <p className="fhint">You have a plan in progress. <button type="button" className="linkbtn" onClick={() => setStep(draft.stops ? 'fill' : 'outline')}>Carry on with it</button> or <button type="button" className="linkbtn" onClick={() => { saveDraft(null); setDraftState({ answers: blankAnswers() }); }}>start again</button>.</p>}
    </Sheet>
  );
}

/* ---------- the questions ---------- */

type Q = { a: Answers; up: (p: Partial<Answers>) => void };

function Where({ a, up }: Q) {
  return (
    <>
      <p className="lede2">Tell me roughly what you have in mind. Not sure yet is fine.</p>
      <Text label="Where to" value={a.where} onChange={v => up({ where: v })} placeholder="Japan, or Italy and Greece, or somewhere warm" autoFocus />
      <Text label="Anything you must see or do" value={a.mustSee} onChange={v => up({ mustSee: v })} placeholder="e.g. a sumo match, teamLab, Mount Fuji" />
      <Text label="Start date, if you know it" type="date" value={a.start} onChange={v => up({ start: v })} />
      {!a.start && <Text label="Or roughly when" value={a.whenNote} onChange={v => up({ whenNote: v })} placeholder="e.g. late October, cherry blossom season" />}
      <div className="field">
        <span className="flabel">How many days, door to door</span>
        <div className="stepper">
          <button type="button" className="chipbtn" onClick={() => up({ days: Math.max(2, a.days - 1) })} aria-label="One day fewer">−</button>
          <b>{a.days} days</b>
          <button type="button" className="chipbtn" onClick={() => up({ days: Math.min(60, a.days + 1) })} aria-label="One day more">+</button>
        </div>
      </div>
    </>
  );
}

function Who({ a, up }: Q) {
  const rows = a.travelers;
  const setRow = (i: number, p: Partial<Answers['travelers'][number]>) => up({ travelers: rows.map((r, k) => (k === i ? { ...r, ...p } : r)) });
  return (
    <>
      <p className="lede2">Who's going, and where is each person starting from? It helps pick where to fly in and out.</p>
      {rows.map((r, i) => (
        <div key={i} className="row2 whorow">
          <Text label={i === 0 ? 'Name' : `Person ${i + 1}`} value={r.name} onChange={v => setRow(i, { name: v })} placeholder={i === 0 ? 'You' : 'Name'} />
          <Text label="From" value={r.from} onChange={v => setRow(i, { from: v })} placeholder="City" />
          {i > 0 && <button type="button" className="linkbtn" onClick={() => up({ travelers: rows.filter((_, k) => k !== i) })}>Remove</button>}
        </div>
      ))}
      <button type="button" className="linkbtn" onClick={() => up({ travelers: [...rows, { name: '', from: rows[rows.length - 1]?.from || '' }] })}>+ Add a person</button>
    </>
  );
}

function Style({ a, up }: Q) {
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter(x => x !== v) : [...list, v]);
  return (
    <>
      <div className="field">
        <span className="flabel">Budget</span>
        <div className="chips" style={{ marginTop: 0 }}>{[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" className="chipbtn plain" aria-pressed={n >= a.budget && n <= (a.budgetTop || a.budget)}
            onClick={() => {
              /* one tap picks a level; a tap on another level makes it a range; a tap after that starts again */
              const top = a.budgetTop || a.budget;
              if (top === a.budget && n !== a.budget) up({ budget: Math.min(n, a.budget), budgetTop: Math.max(n, a.budget) });
              else up({ budget: n, budgetTop: undefined });
            }}>{dollars(n)}</button>
        ))}</div>
        <p className="fhint">{['Shoestring: hostels and street food', 'Careful: simple hotels, cheap eats', 'Comfortable: good hotels, a few nice meals', 'Treat yourselves: nice hotels and restaurants', 'The best: luxury hotels, top restaurants'][a.budget - 1]}</p>
        {/* advanced: a different level for each kind of spending, e.g. cheap flights, nice hotels */}
        <details className="fold budgetby" open={!!a.budgetBy && Object.keys(a.budgetBy).length > 0}>
          <summary>Different for flights, hotels, food, sights?</summary>
          {(['flights', 'hotels', 'food', 'sights'] as const).map(k => (
            <div key={k} className="budrow">
              <span>{k[0].toUpperCase() + k.slice(1)}</span>
              <div className="chips" style={{ marginTop: 0 }}>{[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" className="chipbtn plain" aria-pressed={(a.budgetBy?.[k] ?? a.budget) === n}
                  onClick={() => up({ budgetBy: { ...(a.budgetBy || {}), [k]: n } })}>{dollars(n)}</button>
              ))}</div>
            </div>
          ))}
        </details>
      </div>
      <div className="field">
        <span className="flabel">The vibe</span>
        <div className="chips" style={{ marginTop: 0 }}>{VIBES.map(v => (
          <button key={v} type="button" className="chipbtn plain" aria-pressed={(a.vibes || []).includes(v)}
            onClick={() => { const cur = a.vibes || []; up({ vibes: cur.includes(v) ? cur.filter(x => x !== v) : [...cur, v].slice(-3) }); }}>{v}</button>
        ))}</div>
        <p className="fhint">Pick up to three.</p>
      </div>
      <div className="field">
        <span className="flabel">What you're into</span>
        <div className="chips" style={{ marginTop: 0 }}>{STYLES.map(s => (
          <button key={s} type="button" className="chipbtn plain" aria-pressed={a.styles.includes(s)} onClick={() => up({ styles: toggle(a.styles, s) })}>{s}</button>
        ))}</div>
      </div>
      <div className="field">
        <span className="flabel">Pace</span>
        <div className="chips" style={{ marginTop: 0 }}>{PACES.map(p => (
          <button key={p.value} type="button" className="chipbtn plain" aria-pressed={a.pace === p.value} onClick={() => up({ pace: p.value })}>{p.label}</button>
        ))}</div>
        <p className="fhint">{PACES.find(p => p.value === a.pace)?.hint}</p>
      </div>
      <div className="field">
        <span className="flabel">How you like your days</span>
        <div className="chips" style={{ marginTop: 0 }}>{DAY_STYLES.map(p => (
          <button key={p.value} type="button" className="chipbtn plain" aria-pressed={a.dayStyle === p.value} onClick={() => up({ dayStyle: p.value })}>{p.label}</button>
        ))}</div>
        <p className="fhint">{DAY_STYLES.find(p => p.value === a.dayStyle)?.hint}</p>
      </div>
      <div className="field">
        <span className="flabel">Food needs</span>
        <div className="chips" style={{ marginTop: 0 }}>{DIETS.map(s => (
          <button key={s} type="button" className="chipbtn plain" aria-pressed={a.diets.includes(s)} onClick={() => up({ diets: toggle(a.diets, s) })}>{s}</button>
        ))}</div>
      </div>
      <Text label="Anything else" value={a.notes} onChange={v => up({ notes: v })} multiline placeholder="e.g. two of us hate early starts, one uses a wheelchair, we love onsen" />
    </>
  );
}

/* ---------- the outline ---------- */

function OutlineView({ o, days, left, onChange }: { o: Outline; days: number; left?: number; onChange: (o: Outline) => void }) {
  const nights = o.stops.reduce((n, s) => n + s.nights, 0);
  const setNights = (i: number, n: number) => onChange({ ...o, stops: o.stops.map((s, k) => (k === i ? { ...s, nights: Math.max(1, n) } : s)) });
  return (
    <>
      <h2 className="plan-title">{o.title}</h2>
      <p className="lede2">{o.summary}</p>
      <p className="fhint">Starting {longDate(o.start)}. {o.arrival}</p>
      <ul className="sheet" style={{ marginTop: 10 }}>
        {o.stops.map((s, i) => (
          <li key={i}>
            <div className="item-h">
              <span className="item-n">{s.city}</span><span className="grow" />
              <button type="button" className="chipbtn" aria-label={`One night fewer in ${s.city}`} onClick={() => setNights(i, s.nights - 1)}>−</button>
              <b>{s.nights} {s.nights === 1 ? 'night' : 'nights'}</b>
              <button type="button" className="chipbtn" aria-label={`One night more in ${s.city}`} onClick={() => setNights(i, s.nights + 1)}>+</button>
            </div>
            <p className="item-d">{s.why}</p>
            {o.hops[i] && i < o.stops.length - 1 && <div className="when">Then {o.hops[i].how || o.hops[i].mode} to {o.hops[i].to}, {o.hops[i].duration}</div>}
            {o.stops.length > 1 && <div className="meta"><button type="button" className="linkbtn" onClick={() => onChange({ ...o, stops: o.stops.filter((_, k) => k !== i), hops: o.hops.filter(h => h.from !== s.city && h.to !== s.city) })}>Remove {s.city}</button></div>}
          </li>
        ))}
      </ul>
      <p className={'fhint' + (nights !== days - 1 ? ' warn' : '')}>{nights} nights{nights !== days - 1 ? `, for a ${days}-day trip (${days - 1} nights). Fine if you meant to change it.` : '.'}</p>
      {o.tips.length > 0 && <><h3 className="fsec">Sort out early</h3><ul className="tips">{o.tips.map((t, i) => <li key={i}>{t}</li>)}</ul></>}
      <p className="fhint">Next, WrongTrain looks up current hotels, food and sights for each place and plans the days. It takes a minute or two.{left != null ? ` ${left} more free ${left === 1 ? 'plan' : 'plans'} this month.` : ''}</p>
    </>
  );
}

const STATE_TEXT: Record<StopState, string> = {
  waiting: 'Waiting', research: 'Finding hotels, food and sights…', build: 'Planning the days…', done: 'Done', failed: 'Did not work',
};

function Filling({ o, states, onRetry }: { o: Outline; states: StopState[]; onRetry: () => void }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick(x => x + 1), 1000); return () => clearInterval(t); }, []);
  return (
    <>
      <p className="lede2">Planning each place. You can leave this open, or close it and come back: what is done is kept.</p>
      <ul className="sheet">
        {o.stops.map((s, i) => (
          <li key={i}>
            <div className="item-h"><span className="item-n">{s.city}</span><span className="grow" /><span className={'pill ' + (states[i] === 'done' ? 'ok' : states[i] === 'failed' ? 'no' : 'todo')}>{STATE_TEXT[states[i] || 'waiting']}</span></div>
            <div className="when">{longDate(stopDates(o, i).first)} · {s.nights} {s.nights === 1 ? 'night' : 'nights'}</div>
          </li>
        ))}
      </ul>
      {states.some(s => s === 'failed') && <div className="chips"><button type="button" className="chipbtn go" onClick={onRetry}>Try the rest again</button></div>}
      {states.some(s => s === 'failed') && states.some(s => s === 'done') && <p className="fhint">Or make the trip now; places that did not work get empty days you can fill in.</p>}
    </>
  );
}
