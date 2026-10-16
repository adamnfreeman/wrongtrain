/* Changes waiting for the owner's OK: the list on the To do tab, the trip rule and roles in Trip
   settings, the count on the tab bar, and the message that pops up when a change goes off for
   approval. See model/rules.ts for what needs approval. */
import { useEffect, useState } from 'react';
import type { Trip } from '../model/types';
import { useStore } from '../model/store';
import { stamp } from '../model/time';
import { RULES, ROLES, canDecide, type Role, type Rule } from '../model/rules';
import {
  approveRequest, clearNotice, denyRequest, errText, setMemberRole, setTripRule, useSync, withdrawRequest,
  type Member, type TripRequest,
} from '../sync/engine';
import { Fold, Pill, SecH } from './bits';
import { Choice } from './form';

/** Your role and the trip's rule, when the trip is shared. */
export function useAccess(tripId: string): { role?: Role; rule: Rule; decides: boolean } {
  const info = useStore().sync[tripId];
  const role = info?.role;
  return { role, rule: info?.rule || 'approve', decides: !!role && canDecide(role) };
}

/** How many requests are waiting for you to decide, for the badge on the To do tab. */
export function useWaitingForMe(tripId: string): number {
  const { requests } = useSync();
  const { decides } = useAccess(tripId);
  return decides ? requests.filter(r => r.trip_id === tripId && r.status === 'pending' && !r.local).length : 0;
}

/* ---------- the list ---------- */

export function Requests({ trip }: { trip: Trip }) {
  const { requests, session } = useSync();
  const { decides } = useAccess(trip.id);
  const mine = (r: TripRequest) => !!r.local || (!!r.author && r.author === session?.user.id);
  const here = requests.filter(r => r.trip_id === trip.id);
  const waiting = here.filter(r => r.status === 'pending' && (decides || mine(r) || !r.local));
  const decided = here.filter(r => r.status !== 'pending' && (decides || mine(r))).slice(0, 15);
  if (!waiting.length && !decided.length) return null;
  return (
    <section className="blk" id="requests">
      <SecH title={decides ? 'Waiting for your OK' : 'Waiting for approval'}><span className="kicker">{waiting.length}</span></SecH>
      {waiting.length > 0 ? (
        <ul className="sheet">{waiting.map(r => <RequestItem key={r.id} r={r} decides={decides} mine={mine(r)} />)}</ul>
      ) : <p className="note">Nothing waiting.</p>}
      {decided.length > 0 && (
        <Fold title="Decided" count={decided.length}>
          <ul className="sheet">{decided.map(r => <RequestItem key={r.id} r={r} decides={false} mine={mine(r)} />)}</ul>
        </Fold>
      )}
    </section>
  );
}

const OUTCOME: Record<TripRequest['status'], { label: string; kind: '' | 'ok' | 'todo' | 'no' }> = {
  pending: { label: 'Waiting', kind: 'todo' },
  approved: { label: 'Approved', kind: 'ok' },
  denied: { label: 'Not approved', kind: 'no' },
  withdrawn: { label: 'Withdrawn', kind: '' },
};

function RequestItem({ r, decides, mine }: { r: TripRequest; decides: boolean; mine: boolean }) {
  const [busy, setBusy] = useState(false);
  const [denying, setDenying] = useState(false);
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');
  const run = async (f: () => Promise<void>) => {
    setBusy(true); setMsg('');
    try { await f(); } catch (e) { setMsg(errText(e)); }
    setBusy(false);
  };
  const o = OUTCOME[r.status];
  return (
    <li className="req">
      <div className="kick">
        {mine ? 'You' : r.author_name || 'Someone'} · {stamp(r.created_at)}{r.local ? ' · waiting for signal' : ''}
      </div>
      <ul className="reqlines">{r.summary.map((l, i) => <li key={i}>{l}</li>)}</ul>
      {r.status !== 'pending' && (
        <div className="item-h" style={{ marginTop: 6 }}><Pill kind={o.kind}>{o.label}</Pill>{r.reason && <span className="fhint" style={{ margin: 0 }}>{r.reason}</span>}</div>
      )}
      {r.status === 'pending' && decides && !r.local && !denying && (
        <div className="chips">
          <button type="button" className="chipbtn go" disabled={busy} onClick={() => run(() => approveRequest(r))}>{busy ? 'Saving…' : 'Approve'}</button>
          <button type="button" className="chipbtn" disabled={busy} onClick={() => setDenying(true)}>Deny</button>
        </div>
      )}
      {denying && (
        <div style={{ marginTop: 8 }}>
          <textarea className="search notebox" rows={2} maxLength={300} value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Why not? (optional, they'll see it)" aria-label="Reason for not approving" />
          <div className="chips">
            <button type="button" className="chipbtn go" disabled={busy} onClick={() => run(() => denyRequest(r, reason))}>{busy ? 'Saving…' : 'Deny'}</button>
            <button type="button" className="chipbtn" disabled={busy} onClick={() => { setDenying(false); setReason(''); }}>Cancel</button>
          </div>
        </div>
      )}
      {r.status === 'pending' && mine && !decides && (
        <div className="chips"><button type="button" className="chipbtn" disabled={busy} onClick={() => run(() => withdrawRequest(r))}>Withdraw</button></div>
      )}
      {msg && <p className="geomsg bad" role="alert">{msg}</p>}
    </li>
  );
}

/* ---------- trip settings: the rule and everyone's role ---------- */

const roleLabel = (r: Role) => (r === 'owner' ? 'Owner' : ROLES.find(x => x.value === r)!.label);

/** The trip rule: a choice for the owner, a line of explanation for everyone else. */
export function RuleSetting({ trip }: { trip: Trip }) {
  const { role, rule } = useAccess(trip.id);
  const [msg, setMsg] = useState('');
  const info = RULES.find(r => r.value === rule)!;
  if (role !== 'owner') return (
    <p className="fhint">
      Changes by others: <b>{info.label}</b>. {info.hint}
      {role && <> You're {role === 'organizer' ? 'an' : 'a'} <b>{roleLabel(role)}</b>{role === 'organizer' ? ': you can change anything and approve requests.' : role === 'viewer' ? ': you can see everything and leave notes.' : '.'}</>}
    </p>
  );
  return (
    <>
      <Choice<Rule> label="Changes by others" value={rule} options={RULES} hint={info.hint}
        onChange={async v => { setMsg(''); try { await setTripRule(trip.id, v); } catch (e) { setMsg(errText(e)); } }} />
      {msg && <p className="geomsg bad" role="alert">{msg}</p>}
    </>
  );
}

/** Someone's role: a picker for the owner, a label for everyone else. */
export function RoleControl({ trip, p, owner, onChange, onError }: {
  trip: Trip; p: Member; owner: boolean; onChange: (role: Role) => void; onError: (m: string) => void;
}) {
  if (p.role === 'owner' || !owner) return <Pill kind={p.role === 'owner' ? 'ok' : ''}>{roleLabel(p.role)}</Pill>;
  return (
    <select className="input roleselect" aria-label={`${p.name || 'Their'} role`} value={p.role}
      onChange={async e => {
        const next = e.target.value as Exclude<Role, 'owner'>;
        try { await setMemberRole(trip.id, p.user_id, next); onChange(next); } catch (err) { onError(errText(err)); }
      }}>
      {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
    </select>
  );
}

/* ---------- the pop-up message ---------- */

export function Toast() {
  const { notice } = useSync();
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(clearNotice, notice.bad ? 9000 : 6000);
    return () => clearTimeout(t);
  }, [notice]);
  if (!notice) return null;
  return (
    <div className={'toast' + (notice.bad ? ' bad' : '')} role="status" onClick={clearNotice}>{notice.text}</div>
  );
}
