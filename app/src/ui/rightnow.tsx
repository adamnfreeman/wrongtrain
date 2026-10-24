/* The "Right now" page: only what you need for the thing that's happening, big and obvious. It
   exists only while something is on (model/rightNow.ts); App.tsx adds its tab to the left of Today
   then, and opens it by itself once for each thing. A first version, for Andrea to restyle. */
import { useState } from 'react';
import type { Moment } from '../model/rightNow';
import { fmtT, fmtDur } from '../model/time';
import { dirLink, fmtDist, mapsLink } from '../model/trip';
import { usePrivateDocs } from '../model/privateDocs';
import type { Doc } from '../model/types';
import { useApp } from './ctx';
import { FileTicket, PictureView } from './picture';

const KIND = { flight: 'Your flight', ride: 'Your ride', event: 'Coming up' } as const;

function countdown(m: Moment): string {
  if (m.inMin <= 0) return m.kind === 'flight' ? 'Boarding' : m.kind === 'ride' ? 'Leaving now' : 'Starting now';
  return `in ${fmtDur(m.inMin)}`;
}

export function RightNow({ moment: m, next }: { moment: Moment | null; next: Moment | null }) {
  const { ix } = useApp();
  const mine = usePrivateDocs(ix.trip.id);
  const [msg, setMsg] = useState('');
  const [pic, setPic] = useState<{ src: string; title: string } | null>(null);
  const [fileDoc, setFileDoc] = useState<Doc | null>(null);
  if (!m) return <p className="hint" style={{ marginTop: 40 }}>Nothing coming up right now.</p>;

  /* tickets for this: attached to it; or, failing that, attached to something else that day, or
     not attached at all, whose name shares a real word with it ("teamLab tickets" for teamLab) */
  const all = [...(ix.trip.docs || []), ...mine].filter(d => d.file || d.picture);
  const words = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9\u3040-\u9fff]+/).filter(w => w.length > 3 && !STOP.has(w)));
  const mineWords = words([m.title, m.leg?.how, m.item?.text, m.place?.name].filter(Boolean).join(' '));
  const sameDay = (d: Doc) => !d.for || (d.for.kind === 'leg' ? ix.trip.legs.find(l => l.id === d.for!.id)?.dayId === m.dayId
    : ix.trip.days.find(x => x.id === m.dayId)?.plan.some(p => p.id === d.for!.id));
  const exact = all.filter(d => d.for && ((m.leg && d.for.kind === 'leg' && d.for.id === m.leg.id) || (m.item && d.for.kind === 'plan' && d.for.id === m.item.id)));
  const docs = exact.length ? exact : all.filter(d => sameDay(d) && [...words(d.title)].some(w => mineWords.has(w)));
  const leaveIn = m.leaveBy - (m.at - m.inMin);
  const pinned = m.place && m.place.lat != null && m.place.lng != null ? m.place : null;
  const facts: { k: string; v: string }[] = [];
  if (m.leg) {
    if (m.leg.how) facts.push({ k: m.kind === 'flight' ? 'Flight' : 'Service', v: m.leg.how });
    if (m.leg.arrive) facts.push({ k: 'Arrives', v: fmtT(Number(m.leg.arrive.slice(0, 2)) * 60 + Number(m.leg.arrive.slice(3, 5))) });
    if (m.leg.details) facts.push({ k: 'Details', v: m.leg.details });
    if (m.leg.tickets) facts.push({ k: 'Tickets', v: m.leg.tickets });
  } else if (m.item) {
    if (m.item.text !== m.title) facts.push({ k: 'What', v: m.item.text });
    if (m.place?.area) facts.push({ k: 'Where', v: m.place.area });
  }

  return (
    <div className="rn">
      <div className="rn-kind">{KIND[m.kind]}</div>
      <h1 className="rn-title">{m.title}</h1>
      <div className="rn-time">
        <span className="rn-clock">{fmtT(m.at)}</span>
        <span className={'rn-count' + (m.inMin <= 15 ? ' soon' : '')}>{countdown(m)}</span>
      </div>

      {m.inMin > 0 && (
        <div className={'rn-leave' + (leaveIn <= 0 ? ' now' : '')}>
          {leaveIn <= 0 ? <b>Leave now</b> : <><span>Leave by</span><b>{fmtT(m.leaveBy)}</b><span>in {fmtDur(leaveIn)}</span></>}
          {m.trip && <small>{fmtDist(m.trip.metres)} away, about {fmtDur(m.trip.min)} {m.trip.how}</small>}
          {m.kind === 'flight' && <small>Be at the airport 2½ hours before.</small>}
        </div>
      )}

      {facts.length > 0 && <dl className="rn-facts">{facts.map(f => <div key={f.k}><dt>{f.k}</dt><dd>{f.v}</dd></div>)}</dl>}

      <div className="rn-actions">
        {docs.map(d => (
          <button key={d.id} className="rn-btn primary" onClick={() => d.picture ? setPic({ src: d.picture, title: d.title }) : setFileDoc(d)}>
            Show {d.kind === 'ticket' ? 'ticket' : d.title}
          </button>
        ))}
        {pinned && <a className="rn-btn" href={dirLink(pinned, m.trip?.mode || 'transit')} target="_blank" rel="noopener">Directions</a>}
        {!pinned && m.place && <a className="rn-btn" href={mapsLink(ix, m.place)} target="_blank" rel="noopener">Find it on the map</a>}
      </div>
      {msg && <p className="geomsg bad" role="alert">{msg}</p>}

      {pic && <PictureView src={pic.src} title={pic.title} close={() => setPic(null)} />}
      {fileDoc && <FileTicket d={fileDoc} close={() => setFileDoc(null)} onError={setMsg} />}
      {next && <p className="rn-next">Then: <b>{next.title}</b> at {fmtT(next.at)}</p>}
    </div>
  );
}

const STOP = new Set(['ticket', 'tickets', 'booking', 'confirmation', 'with', 'from', 'your', 'the', 'and', 'train', 'flight']);
