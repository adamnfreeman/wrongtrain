/* The Wallet tab: documents (tickets, bookings, IDs) and money (who paid, who owes whom).

   Documents for the group are part of the trip; private ones (IDs, passports) stay on this phone
   (model/privateDocs.ts). A document can be for a plan item or a travel leg, and then shows there
   on the timeline (DocLinks). Files are kept on the phone for use with no signal (sync/files.ts). */
import { useState } from 'react';
import type { Doc, DocKind, Expense, FileRef, Trip } from '../model/types';
import { getState, patchTrip, pref, setPref, useStore } from '../model/store';
import { deletePrivateDoc, privateDocs, savePrivateDoc, usePrivateDocs } from '../model/privateDocs';
import { CURRENCIES, balances, fmtMoney, settleUp, shares, tripCurrency, venmoLink } from '../model/money';
import { newId } from '../model/trip';
import { fmtHM, shortDate, todayIn } from '../model/time';
import { drop, extOf, keep, openFile, readLocal, shrink } from '../sync/files';
import { rate } from '../sync/rates';
import { Empty, Ext, Fold, Pill, SecH } from './bits';
import { Check, Choice, DeleteButton, Sheet, Text } from './form';
import { useApp } from './ctx';

export const DOC_KINDS: { value: DocKind; label: string; group: string }[] = [
  { value: 'ticket', label: 'Ticket', group: 'Tickets' },
  { value: 'booking', label: 'Booking', group: 'Bookings' },
  { value: 'id', label: 'ID or passport', group: 'IDs & passports' },
  { value: 'insurance', label: 'Insurance', group: 'Insurance' },
  { value: 'other', label: 'Other', group: 'Other' },
];

/** Who you are on this trip, by name, for "Paid by" and "Pay with Venmo". */
function useMe(trip: Trip): string {
  const { me } = useStore();
  return trip.travelers.find(t => t.toLowerCase() === me.trim().toLowerCase()) || '';
}

export function Wallet() {
  const [seg, setSeg] = useState<'docs' | 'money'>(() => pref('wallet', 'docs'));
  const pick = (s: 'docs' | 'money') => { setSeg(s); setPref('wallet', s); };
  return (
    <>
      <h1 className="page-h">Wallet</h1>
      <div className="seg" role="group" aria-label="Wallet">
        <button aria-pressed={seg === 'docs'} onClick={() => pick('docs')}>Documents</button>
        <button aria-pressed={seg === 'money'} onClick={() => pick('money')}>Money</button>
      </div>
      {seg === 'docs' ? <Docs /> : <Money />}
    </>
  );
}

/* ---------- documents ---------- */

/** What a document is for, in words: "Nov 3 · 6:00 PM Kabuki" or "Kyoto → Osaka". */
function forLabel(t: Trip, f?: Doc['for']): string {
  if (!f) return '';
  if (f.kind === 'leg') { const l = t.legs.find(x => x.id === f.id); return l ? `${l.from} → ${l.to}` : ''; }
  for (const d of t.days) {
    const p = d.plan.find(x => x.id === f.id);
    if (p) return `${shortDate(d.date)} · ${p.time ? fmtHM(p.time) + ' ' : ''}${p.text}`;
  }
  return '';
}

function Docs() {
  const { ix, edit } = useApp();
  const t = ix.trip, mine = usePrivateDocs(t.id);
  const all = [...(t.docs || []), ...mine];
  if (!all.length) return (
    <>
      <Empty>Keep tickets, bookings and IDs here, so they open with no signal.</Empty>
      <div className="chips" style={{ justifyContent: 'center' }}><button className="chipbtn go" onClick={() => edit({ kind: 'doc' })}>+ Add a document</button></div>
    </>
  );
  return (
    <>
      {DOC_KINDS.map(k => {
        const list = all.filter(d => d.kind === k.value);
        if (!list.length) return null;
        return (
          <section key={k.value} className="blk">
            <SecH title={k.group}><span className="kicker">{list.length}</span></SecH>
            <ul className="sheet">{list.map(d => <DocItem key={d.id} d={d} />)}</ul>
          </section>
        );
      })}
      <button className="linkbtn" onClick={() => edit({ kind: 'doc' })}>+ Add a document</button>
      <p className="note" style={{ marginTop: 14 }}>Private documents stay on this phone only. Everything else is shared with the trip and kept on each phone for use with no signal.</p>
    </>
  );
}

function DocItem({ d }: { d: Doc }) {
  const { ix, edit } = useApp();
  const [msg, setMsg] = useState('');
  const f = forLabel(ix.trip, d.for);
  return (
    <li>
      <div className="item-h"><span className="item-n">{d.title}</span>{d.private ? <Pill>Private</Pill> : null}</div>
      {f && <div className="when">For {f}</div>}
      {d.notes && <p className="item-d">{d.notes}</p>}
      <div className="meta">
        {d.file && <button className="linkbtn" onClick={() => openFile(d.file!.path, d.file!.name).catch(e => setMsg((e as Error).message))}>Open</button>}
        {d.link && <Ext href={d.link}>Open link</Ext>}
        <button className="linkbtn" onClick={() => edit({ kind: 'doc', id: d.id })}>Edit</button>
      </div>
      {msg && <p className="geomsg bad">{msg}</p>}
    </li>
  );
}

/** Tickets for a plan item or leg, as links on the timeline. */
export function DocLinks({ kind, id }: { kind: 'plan' | 'leg'; id: string }) {
  const { ix } = useApp();
  const mine = usePrivateDocs(ix.trip.id);
  const [msg, setMsg] = useState('');
  const list = [...(ix.trip.docs || []), ...mine].filter(d => d.for?.kind === kind && d.for.id === id);
  if (!list.length) return null;
  return (
    <div className="meta doclinks">
      {list.map(d => d.file
        ? <button key={d.id} className="linkbtn" onClick={() => openFile(d.file!.path, d.file!.name).catch(e => setMsg((e as Error).message))}>{d.kind === 'ticket' ? 'Ticket' : 'Document'}: {d.title}</button>
        : d.link ? <Ext key={d.id} href={d.link}>{d.title}</Ext> : null)}
      {msg && <span className="bad">{msg}</span>}
    </div>
  );
}

/** A file picked or photographed, waiting to be saved. */
function FilePick({ label, file, onPick, hint }: { label: string; file: FileRef | File | null; onPick: (f: File) => void; hint?: string }) {
  return (
    <div className="field">
      <span className="flabel">{label}</span>
      <label className="chipbtn filepick">
        {file ? `Replace (${file.name})` : 'Take a photo or choose a file'}
        <input type="file" accept="image/*,application/pdf" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ''; }} />
      </label>
      {hint && <p className="fhint">{hint}</p>}
    </div>
  );
}

/** Keeps a picked file: images are made smaller first. */
async function store(path: string, f: File): Promise<FileRef> {
  const blob = await shrink(f, 2400, 0.85);
  await keep(path, blob);
  return { path, name: f.name || path.split('/').pop()!, type: blob.type || f.type, size: blob.size };
}

export function DocEditor({ trip, id, forRef, close }: { trip: Trip; id?: string; forRef?: Doc['for']; close: () => void }) {
  const shared = !!getState().sync[trip.id];
  const orig = (trip.docs || []).find(d => d.id === id) || privateDocs(trip.id).find(d => d.id === id);
  const [d, setD] = useState<Doc>(orig || { id: newId('doc'), title: '', kind: 'ticket', at: new Date().toISOString(), ...(forRef ? { for: forRef } : {}) });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const up = (p: Partial<Doc>) => setD({ ...d, ...p });
  const options = [
    { value: '', label: 'Nothing in particular' },
    ...trip.legs.map(l => ({ value: `leg:${l.id}`, label: `Travel: ${l.from} → ${l.to}` })),
    ...trip.days.flatMap(day => day.plan.filter(p => p.text.trim()).map(p => ({ value: `plan:${p.id}`, label: `${shortDate(day.date)}${p.time ? ' ' + fmtHM(p.time) : ''}: ${p.text.slice(0, 50)}` }))),
  ];
  const commit = async () => {
    setBusy(true); setMsg('');
    try {
      let next: Doc = { ...d, title: d.title.trim() || file?.name || 'Document', addedBy: d.addedBy || getState().me || undefined };
      const base = next.private ? `private/${next.id}` : `${trip.id}/docs/${next.id}`;
      if (file) {
        next.file = await store(`${base}.${extOf(file.type, file.name)}`, file);
        if (orig?.file && orig.file.path !== next.file.path) await drop(orig.file.path);
      } else if (orig?.file && !!orig.private !== !!next.private) {
        /* moved between private and shared: the file moves with it */
        const blob = await readLocal(orig.file.path);
        if (blob) { const path = `${base}.${orig.file.path.split('.').pop()}`; await keep(path, blob); next.file = { ...orig.file, path }; await drop(orig.file.path); }
      }
      if (!next.file && !next.link && !next.notes) throw new Error('Add a file, a link or a note.');
      if (next.private) {
        savePrivateDoc(trip.id, next);
        if (orig && !orig.private) patchTrip(trip.id, t => ({ ...t, docs: (t.docs || []).filter(x => x.id !== next.id) }));
      } else {
        next = { ...next, private: undefined };
        patchTrip(trip.id, t => ({ ...t, docs: (t.docs || []).some(x => x.id === next.id) ? (t.docs || []).map(x => (x.id === next.id ? next : x)) : [...(t.docs || []), next] }));
        if (orig?.private) deletePrivateDoc(trip.id, next.id);
      }
      close();
    } catch (e) { setMsg((e as Error).message); setBusy(false); }
  };
  const remove = async () => {
    if (orig?.private) { deletePrivateDoc(trip.id, orig.id); if (orig.file) await drop(orig.file.path); return close(); }
    patchTrip(trip.id, t => ({ ...t, docs: (t.docs || []).filter(x => x.id !== d.id) }));
    /* the file goes only if the document did (it may be waiting for the owner's OK) */
    if (orig?.file && !(getState().trips.find(t => t.id === trip.id)?.docs || []).some(x => x.id === d.id)) await drop(orig.file.path);
    close();
  };
  return (
    <Sheet title={orig ? 'Document' : 'Add a document'} onCancel={close} onSave={() => void commit()} saveLabel={busy ? '…' : 'Save'} canSave={!busy}
      footer={orig && <DeleteButton label="Delete this document" confirmText={`Delete “${orig.title}”?`} onDelete={() => void remove()} />}>
      <Text label="What it is" value={d.title} onChange={v => up({ title: v })} placeholder="e.g. Shinkansen to Tokyo, Ana's passport" autoFocus={!orig} />
      <Choice<DocKind> label="Kind" value={d.kind} options={DOC_KINDS} onChange={v => up({ kind: v, ...(v === 'id' && !orig ? { private: true } : {}) })} />
      <FilePick label="File" file={file || d.file || null} onPick={setFile} hint="A photo, a scan or a PDF. Kept on this phone, so it opens with no signal." />
      <Text label="Or a link" type="url" value={d.link || ''} onChange={v => up({ link: v.trim() || undefined })} placeholder="https://" />
      <Choice label="For" value={d.for ? `${d.for.kind}:${d.for.id}` : ''} options={options}
        onChange={v => { const [k, i] = v.split(':'); up({ for: v ? { kind: k as 'plan' | 'leg', id: i } : undefined }); }}
        hint="It shows there on the timeline, ready to open." />
      <Text label="Notes" value={d.notes || ''} onChange={v => up({ notes: v || undefined })} placeholder="e.g. Seat 7A, booking ref ABC123" multiline />
      <Check label="Private" checked={!!d.private} onChange={v => up({ private: v || undefined })}
        hint={shared ? 'Only on this phone, never shared. Use for passports and IDs.' : 'Only on this phone, even if you share the trip later.'} />
      {msg && <p className="geomsg bad" role="alert">{msg}</p>}
    </Sheet>
  );
}

/* ---------- money ---------- */

function Money() {
  const { ix, edit } = useApp();
  const t = ix.trip, cur = tripCurrency(t), me = useMe(t);
  const [venmo, setVenmo] = useState((me && t.venmo?.[me]) || '');
  if (t.travelers.length < 2) return (
    <>
      <Empty>To split costs, add who's going: Trip settings, then Who's going.</Empty>
      <div className="chips" style={{ justifyContent: 'center' }}><button className="chipbtn go" onClick={() => edit({ kind: 'trip' })}>Trip settings</button></div>
    </>
  );
  const b = balances(t), pay = settleUp(b);
  const expenses = (t.expenses || []).slice().sort((x, y) => y.at.localeCompare(x.at));
  const markPaid = (from: string, to: string, cents: number, via: 'venmo' | 'cash' | 'other') => {
    if (!confirm(`Mark ${fmtMoney(cents, cur)} from ${from} to ${to} as paid?`)) return;
    patchTrip(t.id, x => ({ ...x, settlements: [...(x.settlements || []), { id: newId('s'), from, to, amount: cents / 100, at: new Date().toISOString(), via }] }));
  };
  return (
    <>
      <section className="blk">
        <SecH title="Settle up" />
        {pay.length ? (
          <ul className="sheet">
            {pay.map(p => (
              <li key={p.from + p.to}>
                <div className="item-h"><span className="item-n">{p.from === me ? 'You' : p.from} → {p.to === me ? 'you' : p.to}</span><span className="grow" /><b>{fmtMoney(p.cents, cur)}</b></div>
                <div className="meta">
                  {p.from === me && t.venmo?.[p.to] && <Ext href={venmoLink(t.venmo[p.to], p.cents, `${t.name}: settling up`)}>Pay with Venmo</Ext>}
                  <button className="linkbtn" onClick={() => markPaid(p.from, p.to, p.cents, p.from === me && t.venmo?.[p.to] ? 'venmo' : 'other')}>Mark as paid</button>
                </div>
              </li>
            ))}
          </ul>
        ) : <p className="note">{expenses.length ? 'Everyone is square.' : 'Nothing to settle yet.'}</p>}
        {me && (
          <div className="sbar" style={{ marginTop: 10 }}>
            <div className="sin"><input className="search" style={{ paddingRight: 12 }} aria-label="Your Venmo username" placeholder="Your Venmo username, so people can pay you"
              value={venmo} onChange={e => setVenmo(e.target.value)}
              onBlur={() => { const v = venmo.trim().replace(/^@/, ''); if (v !== (t.venmo?.[me] || '')) patchTrip(t.id, x => ({ ...x, venmo: { ...(x.venmo || {}), [me]: v } })); }} /></div>
          </div>
        )}
        {!me && <p className="fhint">Set your name at the bottom of the page to one of {t.travelers.join(', ')} to pay with Venmo.</p>}
      </section>
      <section className="blk">
        <SecH title="Expenses"><span className="kicker">{fmtMoney(expenses.reduce((s, e) => s + Math.round(e.amount * e.rate * 100), 0), cur)}</span></SecH>
        {expenses.length ? <ul className="sheet">{expenses.map(e => <ExpenseItem key={e.id} e={e} cur={cur} />)}</ul> : <Empty>Paid for the group? Add it here and the app works out who owes what.</Empty>}
        <button className="linkbtn" onClick={() => edit({ kind: 'expense' })}>+ Add an expense</button>
      </section>
      {(t.settlements || []).length > 0 && (
        <Fold title="Payments made" count={t.settlements!.length}>
          <ul className="sheet">{t.settlements!.slice().reverse().map(s => (
            <li key={s.id}><div className="item-h"><span className="item-n">{s.from} → {s.to}</span><span className="grow" /><span>{fmtMoney(Math.round(s.amount * 100), cur)}</span></div>
              <div className="meta"><span>{shortDate(s.at.slice(0, 10))}{s.via === 'venmo' ? ' · Venmo' : ''}</span></div></li>
          ))}</ul>
        </Fold>
      )}
    </>
  );
}

function ExpenseItem({ e, cur }: { e: Expense; cur: string }) {
  const { edit } = useApp();
  const [msg, setMsg] = useState('');
  const n = shares(e).size, uneven = e.split.some(s => s.amount != null);
  return (
    <li>
      <div className="item-h"><span className="item-n">{e.what}</span><span className="grow" /><b>{fmtMoney(Math.round(e.amount * 100), e.currency)}</b></div>
      <div className="meta">
        <span>Paid by {e.paidBy}</span><span>{uneven ? 'Split unevenly' : n === 1 ? `For ${e.split[0]?.who || e.paidBy}` : `Split ${n} ways`}</span>
        {e.currency !== cur && <span>≈ {fmtMoney(Math.round(e.amount * e.rate * 100), cur)}</span>}
      </div>
      <div className="meta">
        {e.receipt && <button className="linkbtn" onClick={() => openFile(e.receipt!.path, e.receipt!.name).catch(x => setMsg((x as Error).message))}>Receipt</button>}
        <button className="linkbtn" onClick={() => edit({ kind: 'expense', id: e.id })}>Edit</button>
      </div>
      {msg && <p className="geomsg bad">{msg}</p>}
    </li>
  );
}

export function ExpenseEditor({ trip, id, close }: { trip: Trip; id?: string; close: () => void }) {
  const cur = tripCurrency(trip);
  const orig = (trip.expenses || []).find(e => e.id === id);
  const me = trip.travelers.find(x => x.toLowerCase() === getState().me.trim().toLowerCase()) || trip.travelers[0] || '';
  const today = trip.days.find(d => d.date === todayIn(trip.destinations[0]?.timeZone || 'UTC'))?.id;
  const [e, setE] = useState<Expense>(orig || {
    id: newId('e'), what: '', amount: 0, currency: cur, rate: 1, paidBy: me, split: trip.travelers.map(who => ({ who })), at: new Date().toISOString(), ...(today ? { dayId: today } : {}),
  });
  const [amount, setAmount] = useState(orig ? String(orig.amount) : '');
  const [rateText, setRateText] = useState(String(orig?.rate ?? 1));
  const [uneven, setUneven] = useState(!!orig?.split.some(s => s.amount != null));
  const [each, setEach] = useState<Record<string, string>>(() => Object.fromEntries((orig?.split || []).filter(s => s.amount != null).map(s => [s.who, String(s.amount)])));
  const [receipt, setReceipt] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const up = (p: Partial<Expense>) => setE({ ...e, ...p });
  const setCurrency = async (c: string) => {
    up({ currency: c });
    if (c === cur) return setRateText('1');
    setRateText('');
    const r = await rate(c, cur);
    setRateText(r ? String(+r.toFixed(6)) : '');
    if (!r) setMsg(`No signal for today's rate. Enter how many ${cur} one ${c} is worth.`);
  };
  const inSplit = (who: string) => e.split.some(s => s.who === who);
  const toggle = (who: string) => up({ split: inSplit(who) ? e.split.filter(s => s.who !== who) : [...e.split, { who }] });
  const commit = async () => {
    setMsg('');
    const amt = Number(amount.replace(',', '.')), r = e.currency === cur ? 1 : Number(rateText.replace(',', '.'));
    if (!e.what.trim()) return setMsg('Say what it was for.');
    if (!(amt > 0)) return setMsg('Enter the amount.');
    if (!(r > 0)) return setMsg(`Enter the rate: how many ${cur} one ${e.currency} is worth.`);
    if (!e.split.length) return setMsg('Pick who it is split between.');
    let split = e.split.map(s => ({ who: s.who }) as Expense['split'][number]);
    if (uneven) {
      split = e.split.map(s => ({ who: s.who, amount: Number((each[s.who] || '0').replace(',', '.')) }));
      const sum = split.reduce((x, s) => x + (s.amount || 0), 0);
      if (Math.abs(sum - amt) > 0.009) return setMsg(`The amounts add up to ${sum.toFixed(2)}, not ${amt.toFixed(2)}.`);
    }
    setBusy(true);
    try {
      let next: Expense = { ...e, what: e.what.trim(), amount: amt, rate: r, split, addedBy: e.addedBy || getState().me || undefined };
      if (receipt) {
        const path = `${trip.id}/receipts/${next.id}.${extOf(receipt.type, receipt.name)}`;
        const blob = await shrink(receipt, 1800, 0.8);
        await keep(path, blob);
        next = { ...next, receipt: { path, name: receipt.name || 'receipt', type: blob.type, size: blob.size } };
      }
      patchTrip(trip.id, t => ({ ...t, ...(t.currency ? {} : { currency: cur }), expenses: (t.expenses || []).some(x => x.id === next.id) ? t.expenses!.map(x => (x.id === next.id ? next : x)) : [...(t.expenses || []), next] }));
      close();
    } catch (x) { setMsg((x as Error).message); setBusy(false); }
  };
  const currencies = [...new Set([cur, e.currency, ...CURRENCIES])].map(c => ({ value: c, label: c }));
  return (
    <Sheet title={orig ? 'Expense' : 'Add an expense'} onCancel={close} onSave={() => void commit()} saveLabel={busy ? '…' : 'Save'} canSave={!busy}
      footer={orig && <DeleteButton label="Delete this expense" confirmText={`Delete “${orig.what}”?`} onDelete={() => { patchTrip(trip.id, t => ({ ...t, expenses: (t.expenses || []).filter(x => x.id !== orig.id) })); close(); }} />}>
      <Text label="What for" value={e.what} onChange={v => up({ what: v })} placeholder="e.g. Dinner at Pontochō" autoFocus={!orig} />
      <div className="row2">
        <Text label="Amount" type="decimal" value={amount} onChange={setAmount} placeholder="0.00" />
        <Choice label="Currency" value={e.currency} options={currencies} onChange={v => void setCurrency(v)} />
      </div>
      {e.currency !== cur && <Text label={`${cur} per ${e.currency}`} type="decimal" value={rateText} onChange={setRateText} hint={`Today's rate, filled in when there is signal. Balances are kept in ${cur}.`} />}
      <Choice label="Paid by" value={e.paidBy} options={trip.travelers.map(p => ({ value: p, label: p }))} onChange={v => up({ paidBy: v })} />
      <div className="field">
        <span className="flabel">Split between</span>
        {trip.travelers.map(p => (
          <div key={p} className="splitrow">
            <Check label={p} checked={inSplit(p)} onChange={() => toggle(p)} />
            {uneven && inSplit(p) && <input className="input splitamt" inputMode="decimal" aria-label={`${p}'s share`} value={each[p] || ''} onChange={x => setEach({ ...each, [p]: x.target.value })} placeholder="0.00" />}
          </div>
        ))}
        <Check label="Different amounts" checked={uneven} onChange={setUneven} hint={uneven ? undefined : 'Off: split evenly.'} />
      </div>
      <Choice label="Day" value={e.dayId || ''} options={[{ value: '', label: 'Not on a day' }, ...trip.days.map(d => ({ value: d.id, label: shortDate(d.date) }))]} onChange={v => up({ dayId: v || undefined })} />
      <FilePick label="Receipt" file={receipt || e.receipt || null} onPick={setReceipt} hint="Shared with the trip, so everyone can see it." />
      {msg && <p className="geomsg bad" role="alert">{msg}</p>}
    </Sheet>
  );
}
