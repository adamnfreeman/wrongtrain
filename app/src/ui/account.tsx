/* Sign-in, Account & settings, sharing a trip with the group, joining one with a code, and the save status line. */
import { useEffect, useRef, useState } from 'react';
import type { Trip } from '../model/types';
import { getState, setMe, useStore } from '../model/store';
import { changeEmail, createInvite, deleteAccount, verifyEmailChange, errText, joinTrip, leaveTrip, members, removeMember, setMyName, shareTrip, signOut, sendCode, useSync, verifyCode, type Member, isSignedIn } from '../sync/engine';
import { DeleteButton, Sheet, Text } from './form';
import { shareBase } from '../native';
import { ROLES } from '../model/rules';
import { RoleControl, RuleSetting } from './requests';
import { ThemeSwitch } from './theme';
import { Avatar, makeAvatar, myAvatar, saveMyAvatar, useMyAvatar } from './avatar';
import { JAPAN } from '../edition';
import { savedCreds } from '../sheet/live';

/* ---------- sign in ---------- */

export function SignInSheet({ close, then, why }: { close: () => void; then?: () => void; why?: string }) {
  const { me } = useStore();
  const [email, setEmail] = useState('');
  const [name, setName] = useState(me);
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const okEmail = /^\S+@\S+\.\S+$/.test(email.trim());
  const send = async () => {
    setBusy(true); setMsg('');
    try { await sendCode(email); setSent(true); } catch (e) { setMsg(errText(e)); }
    setBusy(false);
  };
  const verify = async () => {
    setBusy(true); setMsg('');
    try {
      if (name.trim()) setMe(name);
      await verifyCode(email, code);
      if (name.trim()) await setMyName(name.trim());
      close(); then?.();
    } catch (e) { setMsg(errText(e)); setBusy(false); }
  };
  return (
    <Sheet title="Sign in" onCancel={close} onSave={sent ? verify : send} saveLabel={busy ? '…' : sent ? 'Sign in' : 'Send code'}
      canSave={!busy && (sent ? code.replace(/\D/g, '').length >= 6 && !!name.trim() : okEmail)}>
      {why && <p className="fhint" style={{ marginTop: 4 }}>{why}</p>}
      {!sent ? (
        <>
          <Text label="Email" type="text" value={email} onChange={setEmail} placeholder="you@example.com" autoFocus
            hint="We email you a six-digit code. No password to remember." />
          <div className="chips"><button type="button" className="chipbtn go" disabled={!okEmail || busy} onClick={send}>{busy ? 'Sending…' : 'Send code'}</button></div>
        </>
      ) : (
        <>
          <p className="fhint" style={{ marginTop: 10 }}>Sent to <b>{email.trim()}</b>. It can take a minute; check spam too. <button type="button" className="linkbtn" onClick={() => { setSent(false); setCode(''); }}>Use a different email</button></p>
          <Text label="Code" value={code} onChange={v => setCode(v.replace(/[^\d ]/g, '').slice(0, 8))} placeholder="123456" autoFocus />
          <Text label="Your name" value={name} onChange={setName} placeholder="As the group knows you" hint="Shown on your notes and ticks." />
          <div className="chips"><button type="button" className="chipbtn go" disabled={busy || code.replace(/\D/g, '').length < 6 || !name.trim()} onClick={verify}>{busy ? 'Checking…' : 'Sign in'}</button></div>
        </>
      )}
      {msg && <p className="geomsg bad" role="alert">{msg}</p>}
    </Sheet>
  );
}

/* ---------- joining ---------- */

export function JoinSheet({ close, initial = '' }: { close: () => void; initial?: string }) {
  const sync = useSync();
  const { me } = useStore();
  const [name, setName] = useState(me);
  const needName = !!sync.session && !me;
  const [code, setCode] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [signIn, setSignIn] = useState(false);
  const join = async () => {
    if (!isSignedIn()) return setSignIn(true);
    setBusy(true); setMsg('');
    if (name.trim() && name.trim() !== me) setMe(name);
    try { await joinTrip(code); close(); } catch (e) { setMsg(errText(e)); setBusy(false); }
  };
  if (signIn) return <SignInSheet close={() => setSignIn(false)} then={join} why="Sign in to join the trip. Everyone on it sees the same plan, ticks and notes." />;
  return (
    <Sheet title="Join a trip" onCancel={close} onSave={join} saveLabel={busy ? '…' : 'Join'} canSave={!busy && code.replace(/\s/g, '').length >= 6 && (!needName || !!name.trim())}>
      <Text label="Invite code" value={code} onChange={v => setCode(v.toUpperCase())} placeholder="e.g. K7PQ2MXA" autoFocus
        hint="Ask someone on the trip for a code: Trip settings, then Invite people." />
      {needName && <Text label="Your name" value={name} onChange={setName} placeholder="As the group knows you" hint="Shown to everyone on the trip, on your notes, ticks and requests." />}
      {!sync.session && <p className="fhint">You'll sign in with your email next.</p>}
      {msg && <p className="geomsg bad" role="alert">{msg}</p>}
    </Sheet>
  );
}

/* ---------- sharing, inside Trip settings ---------- */

export function Sharing({ trip, onLeft }: { trip: Trip; onLeft: () => void }) {
  const { sync: shared } = useStore();
  const sync = useSync();
  const isShared = !!shared[trip.id];
  const [signIn, setSignIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [code, setCode] = useState('');
  const [people, setPeople] = useState<Member[] | null>(null);
  const uid = sync.session?.user.id;
  const { me } = useStore();
  const [name, setName] = useState(me);

  useEffect(() => {
    if (!isShared || !uid) return;
    let live = true;
    members(trip.id).then(m => live && setPeople(m)).catch(() => {});
    return () => { live = false; };
  }, [isShared, uid, trip.id]);

  const share = async () => {
    if (!isSignedIn()) return setSignIn(true);
    if (!getState().me) { if (!name.trim()) return setMsg('Add your name first, so everyone knows who you are.'); setMe(name); }
    setBusy(true); setMsg('');
    try { await shareTrip(trip.id); setCode(await createInvite(trip.id)); } catch (e) { setMsg(errText(e)); }
    setBusy(false);
  };
  const invite = async () => { setBusy(true); setMsg(''); try { setCode(await createInvite(trip.id)); } catch (e) { setMsg(errText(e)); } setBusy(false); };
  const link = code ? `${shareBase()}#join=${code}` : '';
  const send = async () => {
    const text = `Join “${trip.name}” on WrongTrain with the code ${code}`;
    const canShare = typeof navigator.share === 'function';
    try { if (canShare) await navigator.share({ title: trip.name, text, url: link }); else { await navigator.clipboard.writeText(`${text}: ${link}`); setMsg('Copied.'); } }
    catch { /* cancelled */ }
  };

  if (signIn) return <SignInSheet close={() => setSignIn(false)} then={share} why="Sign in to share this trip. You'll get a code to send to everyone coming." />;
  if (trip.sample) return <p className="fhint">To share the sample, start your own copy of it from the welcome screen first.</p>;
  const owner = people?.find(p => p.user_id === uid)?.role === 'owner';
  return (
    <div>
      {!isShared ? (
        <>
          <p className="fhint" style={{ marginTop: 0 }}>Only on this phone right now. Share it and everyone you invite can see it, add ideas, tick things off and leave notes, live. You decide who can change the plan.</p>
          {sync.session && !me && <Text label="Your name" value={name} onChange={setName} placeholder="As the group knows you" hint="Shown to everyone on the trip." />}
          <div className="chips"><button type="button" className="chipbtn go" disabled={busy} onClick={share}>{busy ? 'Sharing…' : 'Share with the group'}</button></div>
        </>
      ) : (
        <>
          <p className="fhint" style={{ marginTop: 0 }}>Shared. Changes anyone makes reach everyone's phone.</p>
          {people && (
            <ul className="sheet" style={{ marginTop: 10 }}>
              {people.map(p => (
                <li key={p.user_id}>
                  <div className="item-h">
                    <Avatar name={p.name || '?'} src={p.user_id === uid ? myAvatar() || p.avatar : p.avatar} size={30} />
                    <span className="item-n">{p.name || 'Someone'}{p.user_id === uid ? ' (you)' : ''}</span>
                    <span className="grow" />
                    <RoleControl trip={trip} p={p} owner={owner && p.user_id !== uid} onError={setMsg}
                      onChange={role => setPeople(people.map(x => (x.user_id === p.user_id ? { ...x, role } : x)))} />
                    {owner && p.user_id !== uid && <button type="button" className="linkbtn" onClick={async () => {
                      if (!confirm(`Take ${p.name || 'them'} off the trip?`)) return;
                      try { await removeMember(trip.id, p.user_id); setPeople(people.filter(x => x.user_id !== p.user_id)); } catch (e) { setMsg(errText(e)); }
                    }}>Remove</button>}
                  </div>
                  {owner && p.role !== 'owner' && <div className="meta"><span>{ROLES.find(r => r.value === p.role)?.hint}</span></div>}
                </li>
              ))}
            </ul>
          )}
          <RuleSetting trip={trip} />
          <div className="chips"><button type="button" className="chipbtn go" disabled={busy || !sync.session} onClick={invite}>{busy ? 'Making a code…' : 'Invite people'}</button></div>
          {!sync.session && <p className="fhint">Sign in again to invite people. Your changes are kept on this phone meanwhile.</p>}
        </>
      )}
      {code && (
        <div className="invite">
          <p className="fhint" style={{ marginTop: 0 }}>Send this code to each person. It works for 30 days.</p>
          <p className="code" aria-label="Invite code">{code.slice(0, 4)} {code.slice(4)}</p>
          <div className="chips" style={{ justifyContent: 'center' }}>
            <button type="button" className="chipbtn go" onClick={send}>{typeof navigator.share === 'function' ? 'Send…' : 'Copy invite'}</button>
          </div>
        </div>
      )}
      {msg && <p className={'geomsg' + (msg === 'Copied.' ? '' : ' bad')} role="alert">{msg}</p>}
      {isShared && sync.session && (
        <div style={{ marginTop: 16 }}>
          <DeleteButton label="Leave this trip" confirmText={`Leave “${trip.name}”? It comes off this phone; everyone else keeps it.`}
            onDelete={async () => { try { await leaveTrip(trip.id); onLeft(); } catch (e) { setMsg(errText(e)); } }} />
        </div>
      )}
    </div>
  );
}

/* ---------- footer: save status and account ---------- */

const LINE: Record<string, string> = {
  saved: 'Shared · saved for everyone.',
  saving: 'Shared · saving…',
  waiting: 'Shared · waiting for signal. Your changes are kept on this phone and go when you are back online.',
  error: 'Shared · the last change did not save yet; it will try again.',
};

export function SyncLine({ trip }: { trip: Trip }) {
  const { sync: shared } = useStore();
  const sync = useSync();
  if (!shared[trip.id]) return null;
  const st = !sync.session ? 'signedout' : sync.trips[trip.id] || (shared[trip.id].dirty ? 'waiting' : 'saved');
  return <p className={'syncline ' + st}>{st === 'signedout' ? 'Shared · signed out, so changes stay on this phone until you sign in.' : LINE[st]}</p>;
}

/* ---------- account & settings ---------- */

/** The round button in the top corner of every page, opening Account & settings. */
export function AccountButton({ trip }: { trip?: Trip }) {
  const [open, setOpen] = useState(false);
  const pic = useMyAvatar();
  return (
    <>
      <button className={'acctbtn' + (pic ? ' pic' : '')} aria-label="Account & settings" onClick={() => setOpen(true)}>
        {pic ? <img src={pic} alt="" />
          : <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8.5" r="3.6" /><path d="M5 19.5c1.2-3.4 3.8-5 7-5s5.8 1.6 7 5" /></svg>}
      </button>
      {open && <AccountSheet trip={trip} close={() => setOpen(false)} />}
    </>
  );
}

function AccountSheet({ trip, close }: { trip?: Trip; close: () => void }) {
  const { me } = useStore();
  const sync = useSync();
  const [name, setName] = useState(me);
  const [signIn, setSignIn] = useState(false);
  const [newEmail, setNewEmail] = useState(false);
  const saveName = () => { setMe(name); if (name.trim()) void setMyName(name.trim()); };
  return (
    <Sheet title="Account & settings" cancelLabel="Done" onCancel={() => { saveName(); close(); }}>
      <section className="sec" style={{ marginTop: 12 }}>
        <div className="sec-h"><h2>Account</h2></div>
        {JAPAN ? <>
            <p>Signed in to the Japan page as <b>{savedCreds()?.name}</b></p>
            <button className="chipbtn" style={{ marginTop: 10 }} onClick={() => { close(); window.dispatchEvent(new Event('wt-japan-signout')); }}>Sign out</button>
          </>
          : !sync.ready ? <p className="hint">Checking…</p>
          : sync.session ? <>
            <p>Signed in as <b>{sync.session.user.email}</b></p>
            <div className="chips"><button className="chipbtn" onClick={() => void signOut()}>Sign out</button>
              <button className="chipbtn" onClick={() => setNewEmail(true)}>Change email</button></div>
          </> : <>
            <p>Sign in to share trips with your group. Trips on this phone stay here either way.</p>
            <button className="chipbtn go" style={{ marginTop: 10 }} onClick={() => setSignIn(true)}>Sign in</button>
          </>}
      </section>
      <section className="sec">
        <div className="sec-h"><h2>You</h2></div>
        <PhotoPicker name={name || me} />
        <Text label="Your name, for notes and ticks" value={name} onChange={setName}
          placeholder={trip?.travelers[0] ? `e.g. ${trip.travelers[0]}` : 'Your name'} />
      </section>
      <section className="sec">
        <div className="sec-h"><h2>Settings</h2></div>
        <ThemeSwitch />
      </section>
      <section className="sec">
        <div className="sec-h"><h2>About</h2></div>
        <BuildLine />
      </section>
      {!JAPAN && sync.session && <section className="sec">
        <button className="dangerbtn" onClick={async () => {
          if (!confirm('Delete your WrongTrain account? You leave every shared trip, and trips nobody else is on are deleted. Trips only on this phone stay.')) return;
          try { await deleteAccount(); } catch (e) { alert(errText(e)); }
        }}>Delete my account</button>
      </section>}
      {signIn && <SignInSheet close={() => setSignIn(false)} />}
      {newEmail && sync.session && <ChangeEmailSheet now={sync.session.user.email || ''} close={() => setNewEmail(false)} />}
    </Sheet>
  );
}

/** Your profile picture: choose one from the phone, change it, or take it off. */
function PhotoPicker({ name }: { name: string }) {
  const pic = useMyAvatar();
  const input = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const pick = async (f: File | undefined) => {
    if (!f) return;
    setMsg('');
    try { await saveMyAvatar(await makeAvatar(f)); } catch (e) { setMsg(e instanceof Error ? e.message : errText(e)); }
    if (input.current) input.current.value = '';
  };
  return (
    <div className="photopick">
      <Avatar name={name || '?'} src={pic} size={64} />
      <div className="chips" style={{ marginTop: 0 }}>
        <button type="button" className="chipbtn" onClick={() => input.current?.click()}>{pic ? 'Change photo' : 'Add a photo'}</button>
        {pic && <button type="button" className="chipbtn" onClick={() => void saveMyAvatar(null).catch(e => setMsg(errText(e)))}>Remove</button>}
      </div>
      <input ref={input} type="file" accept="image/*" hidden aria-label="Profile photo" onChange={e => void pick(e.target.files?.[0])} />
      {msg && <p className="geomsg bad" role="alert">{msg}</p>}
    </div>
  );
}

/** Moving the account to a new email: a code goes to the new address, and entering it makes the switch. */
function ChangeEmailSheet({ now, close }: { now: string; close: () => void }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [done, setDone] = useState(false);
  const ok = /^\S+@\S+\.\S+$/.test(email.trim()) && email.trim().toLowerCase() !== now.toLowerCase();
  const send = async () => {
    setBusy(true); setMsg('');
    try { await changeEmail(email); setSent(true); } catch (e) { setMsg(errText(e)); }
    setBusy(false);
  };
  const verify = async () => {
    setBusy(true); setMsg('');
    try { await verifyEmailChange(email, code); setDone(true); } catch (e) { setMsg(errText(e)); }
    setBusy(false);
  };
  return (
    <Sheet title="Change email" cancelLabel={done ? 'Done' : 'Cancel'} onCancel={close}
      onSave={done ? undefined : sent ? verify : send} saveLabel={busy ? '…' : sent ? 'Change' : 'Send code'}
      canSave={!busy && (sent ? code.replace(/\D/g, '').length >= 6 : ok)}>
      {done ? <p style={{ marginTop: 12 }}>Done. You now sign in with <b>{email.trim()}</b>. Your trips, name and everything else stay as they were.</p>
        : !sent ? <>
          <p className="fhint" style={{ marginTop: 8 }}>Now: <b>{now}</b>. Your trips stay with your account; only the address you sign in with changes.</p>
          <Text label="New email" value={email} onChange={setEmail} placeholder="you@example.com" autoFocus />
          <div className="chips"><button type="button" className="chipbtn go" disabled={!ok || busy} onClick={send}>{busy ? 'Sending…' : 'Send code'}</button></div>
        </> : <>
          <p className="fhint" style={{ marginTop: 10 }}>We sent a six-digit code to <b>{email.trim()}</b>. If a code also arrives at {now}, that's to confirm it's you; the one to enter here is from the new address.</p>
          <Text label="Code" value={code} onChange={v => setCode(v.replace(/[^\d ]/g, '').slice(0, 8))} placeholder="123456" autoFocus />
          <div className="chips"><button type="button" className="chipbtn go" disabled={busy || code.replace(/\D/g, '').length < 6} onClick={verify}>{busy ? 'Checking…' : 'Change email'}</button></div>
        </>}
      {msg && <p className="geomsg bad" role="alert">{msg}</p>}
    </Sheet>
  );
}

/** Which build this is, so you can tell whether a phone has the latest. */
function BuildLine() {
  const at = new Date(__BUILD__.at);
  const when = isNaN(+at) ? '' : at.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  return (
    <p className="buildline">
      <b>WrongTrain build {__BUILD__.n || '?'}</b>
      {when && <span>Made {when}{__BUILD__.commit && ` · ${__BUILD__.commit}`}</span>}
    </p>
  );
}

/** Pulls an invite code out of a #join=CODE link, once. */
export function joinCodeFromLink(): string {
  const m = /[#&]join=([A-Za-z0-9]+)/.exec(location.hash);
  if (!m) return '';
  try { history.replaceState(null, '', location.pathname + location.search); } catch { /* ignore */ }
  return m[1].toUpperCase();
}

export const isShared = (id: string) => !!getState().sync[id];
