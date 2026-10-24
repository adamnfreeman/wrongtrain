/* Every place with a pin, coloured by kind, with your own location when you switch it on, and
   friends on the trip who are sharing where they are (sync/locations.ts). */
import { useEffect, useMemo, useRef, useState } from 'react';
import { TILES, addLogo, findPins } from '../sync/maptiler';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Place } from '../model/types';
import { ALL_PIN_GROUPS, KIND_LABEL, fmtDist, mapsLink, metres, pinGroup } from '../model/trip';
import { Empty, Ext, Fold, Pill, Txt, pinColor } from './bits';
import { DestChips } from './views';
import { useApp } from './ctx';
import { tapped } from './day';
import { Avatar, useTripPeople } from './avatar';
import { JAPAN } from '../edition';
import { useStore } from '../model/store';
import { errText, useSync, type Member } from '../sync/engine';
import { ago, dismissShareNotice, startSharing, stopSharing, useFriendSpots, useShareNotices, useSharingUntil, type FriendSpot } from '../sync/locations';

/** Further than this from every pin, you are not on the trip yet, so the map stays put. */
const FAR = 300000;

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function MapView() {
  const { ix, ui, set, geo } = useApp();
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const me = useRef<{ dot: L.Marker; ring: L.Circle } | null>(null);
  const centered = useRef(false);
  /* places filed by Claude or made by the planner come without pins: look them up while the map is open */
  useEffect(() => { void findPins(ix.trip); }, [ix.trip.id, ix.trip.places.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = (p: Place) => p.lat != null && p.lng != null && !ui.hide[pinGroup(p).key] && (ui.dest === 'all' || p.destinationId === ui.dest);
  const pins = ix.trip.places.filter(shown);
  const spots = useFriendSpots(ix.trip.id, !JAPAN);
  const people = useTripPeople(ix.trip.id);
  const friends = useRef<L.Marker[]>([]);
  const near = useMemo(() => (geo.on && geo.pos
    ? ix.trip.places.filter(p => p.lat != null && !ui.hide[pinGroup(p).key]).map(p => ({ p, d: metres(geo.pos!.lat, geo.pos!.lng, p.lat!, p.lng!) })).sort((a, b) => a.d - b.d)
    : []), [ix, ui.hide, geo.on, geo.pos]);

  /* draw pins whenever the filters change */
  useEffect(() => {
    if (!el.current) return;
    const css = getComputedStyle(document.documentElement), col = (v: string) => css.getPropertyValue(v).trim();
    const m = L.map(el.current, { scrollWheelZoom: false });
    map.current = m;
    L.tileLayer(TILES.url, TILES).addTo(m); addLogo(m);
    const pts: L.LatLngExpression[] = [];
    pins.forEach(p => {
      const g = pinGroup(p);
      L.circleMarker([p.lat!, p.lng!], { radius: g.key === 'stay' ? 9 : 7, color: col('--card'), weight: 2, fillColor: col(g.color), fillOpacity: 1 })
        .addTo(m)
        .bindPopup(`<b>${esc(p.name)}</b><br><i>${esc(p.wishlist ? 'Wishlist' : KIND_LABEL[p.kind])}</i>${p.notes ? `<p>${esc(p.notes)}</p>` : '<br>'}<a href="${esc(mapsLink(ix, p))}" target="_blank" rel="noopener">Open in Google Maps</a>`, { maxWidth: 230 });
      pts.push([p.lat!, p.lng!]);
    });
    if (pts.length) m.fitBounds(L.latLngBounds(pts), { padding: [26, 26], maxZoom: 15 });
    else m.setView([20, 0], 2);
    return () => { m.remove(); map.current = null; me.current = null; };
  }, [ix, ui.dest, ui.hide]);

  /* your location dot */
  useEffect(() => {
    const m = map.current; if (!m) return;
    if (!geo.on || !geo.pos) { if (me.current) { me.current.dot.remove(); me.current.ring.remove(); me.current = null; } centered.current = false; return; }
    const ll: L.LatLngExpression = [geo.pos.lat, geo.pos.lng];
    if (me.current) { me.current.ring.setLatLng(ll).setRadius(geo.pos.acc); me.current.dot.setLatLng(ll); }
    else {
      const c = getComputedStyle(document.documentElement).getPropertyValue('--l-travel').trim();
      me.current = {
        ring: L.circle(ll, { radius: geo.pos.acc, color: c, weight: 1, fillColor: c, fillOpacity: 0.14, interactive: false }).addTo(m),
        dot: L.marker(ll, { icon: L.divIcon({ className: 'me', iconSize: [22, 22] }), zIndexOffset: 1000, keyboard: false }).addTo(m).bindPopup('<b>You are here</b>'),
      };
    }
    if (!centered.current && near.length && near[0].d <= FAR) { centered.current = true; m.setView(ll, 15); }
  }, [geo.on, geo.pos, near]);

  /* friends who are sharing where they are: their picture, or initials, on the map */
  useEffect(() => {
    const m = map.current; if (!m) return;
    friends.current.forEach(f => f.remove());
    friends.current = spots.map(s => {
      const p = people.find(x => x.user_id === s.user_id), name = p?.name || 'Someone';
      const face = p?.avatar ? `<img src="${esc(p.avatar)}" alt="">` : `<span>${esc(name.trim().slice(0, 1).toUpperCase())}</span>`;
      return L.marker([s.lat, s.lng], { icon: L.divIcon({ className: 'friend', html: face, iconSize: [34, 34] }), zIndexOffset: 900, keyboard: false })
        .addTo(m).bindPopup(`<b>${esc(name)}</b><br>${esc(ago(s.at))}`);
    });
  }, [spots, people, ix, ui.dest, ui.hide]);

  return (
    <>
      <h1 className="page-h">Map</h1>
      <div className="chips"><DestChips /></div>
      <div className="map" ref={el} role="application" aria-label="Map of trip places" />
      {geo.supported && (
        <>
          <div className="chips">
            <button className="chipbtn plain" aria-pressed={geo.on} onClick={geo.toggle}>{geo.on ? 'My location: on' : 'Show my location'}</button>
            {geo.on && geo.pos && <button className="chipbtn" onClick={() => map.current?.setView([geo.pos!.lat, geo.pos!.lng], Math.max(map.current.getZoom(), 15))}>Center on me</button>}
          </div>
          {geo.msg && <p className={'geomsg' + (geo.bad ? ' bad' : '')} role="status">{geo.msg}</p>}
        </>
      )}
      {!JAPAN && <FriendFinder spots={spots} people={people} onShow={s => map.current?.setView([s.lat, s.lng], Math.max(map.current.getZoom(), 15))} />}
      <div className="chips">
        {ALL_PIN_GROUPS.map(g => (
          <button key={g.key} className="chipbtn pg" aria-pressed={!ui.hide[g.key]} onClick={() => set({ hide: { ...ui.hide, [g.key]: !ui.hide[g.key] } })}>
            <span className="dot" style={pinColor(g.color)} />{g.label}
          </button>
        ))}
      </div>
      {near.length > 0 && (near[0].d > FAR
        ? <p className="geomsg">You are about {fmtDist(near[0].d)} from the nearest pin, so the map has stayed on the trip.</p>
        : <section className="blk"><h3>Nearest to you</h3><ul className="sheet">{near.slice(0, 6).map(n => <PinItem key={n.p.id} p={n.p} away={n.d} />)}</ul></section>)}
      {/* each city's pins folded by kind, so the page isn't one long list; open the kind you want */}
      {[...ix.trip.destinations.filter(d => ui.dest === 'all' || d.id === ui.dest).map(d => ({ key: d.id, name: d.name, list: pins.filter(p => p.destinationId === d.id) })),
        ...(ui.dest === 'all' ? [{ key: 'else', name: 'Elsewhere', list: pins.filter(p => !p.destinationId) }] : [])]
        .filter(c => c.list.length).map(c => (
          <section key={c.key} className="blk">
            <h3>{c.name}</h3>
            {ALL_PIN_GROUPS.map(g => { const l = c.list.filter(p => pinGroup(p).key === g.key); return l.length
              ? <Fold key={g.key} title={g.label} count={l.length}><ul className="sheet">{l.map(p => <PinItem key={p.id} p={p} />)}</ul></Fold> : null; })}
          </section>
        ))}
      {!pins.length && <Empty>No pins for that filter.</Empty>}
    </>
  );
}

function PinItem({ p, away }: { p: Place; away?: number }) {
  const { ix, edit, show } = useApp();
  return (
    <li className="tapme" onClick={tapped(() => show({ kind: 'place', id: p.id }))}>
      <div className="item-h"><span className="item-n"><span className="dot" style={pinColor(pinGroup(p).color)} />{p.name}</span><Pill>{p.wishlist ? 'Wishlist' : KIND_LABEL[p.kind]}</Pill></div>
      <Txt text={p.notes} className="item-d" />
      <div className="meta">{away != null && <span>{fmtDist(away)} away</span>}<Ext href={mapsLink(ix, p)}>Open in Google Maps</Ext><button className="linkbtn" onClick={() => edit({ kind: 'place', id: p.id })}>Edit</button></div>
    </li>
  );
}

/* ---------- where everyone is ---------- */

const CHOICES: { label: string; until: (lastDay?: string) => Date }[] = [
  { label: '1 hour', until: () => new Date(Date.now() + 3600_000) },
  { label: '4 hours', until: () => new Date(Date.now() + 4 * 3600_000) },
  { label: 'Rest of today', until: () => { const d = new Date(); d.setHours(23, 59, 0, 0); return d; } },
  { label: 'Whole trip', until: last => (last ? new Date(`${last}T23:59:00`) : new Date(Date.now() + 14 * 86400_000)) },
];

function FriendFinder({ spots, people, onShow }: { spots: FriendSpot[]; people: Member[]; onShow: (s: FriendSpot) => void }) {
  const { ix, geo } = useApp();
  const { session } = useSync();
  const shared = !!useStore().sync[ix.trip.id];
  const until = useSharingUntil(ix.trip.id);
  const [msg, setMsg] = useState('');
  const last = ix.trip.days.at(-1)?.date;
  return (
    <section className="blk" id="friends">
      <h3>Where everyone is</h3>
      {ix.trip.sample ? <>
          <p className="fhint" style={{ marginTop: 0 }}>In the sample, Sam and Jordan are made up, sharing where they are for the day. On your own trips, share where you are for as long as you choose; only people on the trip see it.</p>
          {spots.length > 0 && <FriendList spots={spots} people={people} onShow={onShow} />}
        </>
        : !shared ? <p className="fhint">Share the trip with your group (Trip settings → Share with the group) to see where everyone is, when they choose to share it.</p>
        : !session ? <p className="fhint">Sign in to see where everyone is.</p>
        : <>
          {until
            ? <div className="chips"><span className="sharing-on">Sharing where you are until {until.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}{until.toDateString() !== new Date().toDateString() ? `, ${until.toLocaleDateString([], { month: 'short', day: 'numeric' })}` : ''}</span>
                <button className="chipbtn" onClick={() => { setMsg(''); stopSharing(ix.trip.id).catch(e => setMsg(errText(e))); }}>Stop</button></div>
            : <>
              <p className="fhint" style={{ marginTop: 0 }}>Share where you are with the people on this trip, for as long as you choose. Only they can see it.</p>
              <div className="chips">{CHOICES.map(c => (
                <button key={c.label} className="chipbtn" disabled={!geo.supported} onClick={() => { setMsg(''); startSharing(ix.trip.id, c.until(last)); }}>{c.label}</button>
              ))}</div>
            </>}
          {msg && <p className="geomsg bad" role="alert">{msg}</p>}
          {spots.length > 0
            ? <FriendList spots={spots} people={people} onShow={onShow} />
            : <p className="fhint">Nobody else is sharing where they are right now.</p>}
        </>}
    </section>
  );
}

function FriendList({ spots, people, onShow }: { spots: FriendSpot[]; people: Member[]; onShow: (s: FriendSpot) => void }) {
  const { geo } = useApp();
  return <ul className="sheet" style={{ marginTop: 10 }}>{spots.map(s => {
                const p = people.find(x => x.user_id === s.user_id), name = p?.name || 'Someone';
                const d = geo.pos ? metres(geo.pos.lat, geo.pos.lng, s.lat, s.lng) : null;
                return (
                  <li key={s.user_id}>
                    <div className="item-h"><Avatar name={name} src={p?.avatar} size={30} /><span className="item-n">{name}</span><span className="grow" /><span className="kick">{ago(s.at)}</span></div>
                    <div className="meta">{d != null && <span>{fmtDist(d)} away</span>}<button className="linkbtn" onClick={() => onShow(s)}>Show on map</button>
                      <Ext href={`https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`}>Directions</Ext></div>
                  </li>
                );
              })}</ul>;
}

/** "Sam is sharing where they are": a banner over the app when someone on this trip starts sharing,
    with a way to the Map. With the app closed, the push from send-push says it instead. */
export function ShareNotice() {
  const { ix, go } = useApp();
  const people = useTripPeople(ix.trip.id);
  const n = useShareNotices().find(x => x.tripId === ix.trip.id);
  const who = n ? people.find(p => p.user_id === n.userId)?.name || 'Someone on the trip' : '';
  const until = n ? new Date(n.until).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
  useEffect(() => {
    if (!n) return;
    const t = window.setTimeout(() => dismissShareNotice(n), 12_000);
    return () => clearTimeout(t);
  }, [n]);
  if (!n) return null;
  return (
    <div className="sharenote" role="status">
      <Avatar name={who} src={people.find(p => p.user_id === n.userId)?.avatar} size={30} />
      <span><b>{who}</b> is sharing where they are, until {until}.</span>
      <button className="chipbtn go" onClick={() => { dismissShareNotice(n); go('map'); }}>See</button>
      <button className="linkbtn" aria-label="Close" onClick={() => dismissShareNotice(n)}>✕</button>
    </div>
  );
}
