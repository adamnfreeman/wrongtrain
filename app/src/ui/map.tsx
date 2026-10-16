/* Every place with a pin, coloured by kind, with your own location when you switch it on. */
import { useEffect, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Place } from '../model/types';
import { ALL_PIN_GROUPS, KIND_LABEL, fmtDist, mapsLink, metres, pinGroup } from '../model/trip';
import { Empty, Ext, Pill, Txt, pinColor } from './bits';
import { DestChips } from './views';
import { useApp } from './ctx';

/** Further than this from every pin, you are not on the trip yet, so the map stays put. */
const FAR = 300000;

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function MapView() {
  const { ix, ui, set, geo } = useApp();
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const me = useRef<{ dot: L.Marker; ring: L.Circle } | null>(null);
  const centered = useRef(false);

  const shown = (p: Place) => p.lat != null && p.lng != null && !ui.hide[pinGroup(p).key] && (ui.dest === 'all' || p.destinationId === ui.dest);
  const pins = ix.trip.places.filter(shown);
  const near = useMemo(() => (geo.on && geo.pos
    ? ix.trip.places.filter(p => p.lat != null && !ui.hide[pinGroup(p).key]).map(p => ({ p, d: metres(geo.pos!.lat, geo.pos!.lng, p.lat!, p.lng!) })).sort((a, b) => a.d - b.d)
    : []), [ix, ui.hide, geo.on, geo.pos]);

  /* draw pins whenever the filters change */
  useEffect(() => {
    if (!el.current) return;
    const css = getComputedStyle(document.documentElement), col = (v: string) => css.getPropertyValue(v).trim();
    const m = L.map(el.current, { scrollWheelZoom: false });
    map.current = m;
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(m);
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
      {ix.trip.destinations.filter(d => ui.dest === 'all' || d.id === ui.dest).map(d => {
        const list = pins.filter(p => p.destinationId === d.id);
        return list.length ? <section key={d.id} className="blk"><h3>{d.name}</h3><ul className="sheet">{list.map(p => <PinItem key={p.id} p={p} />)}</ul></section> : null;
      })}
      {(() => { const list = pins.filter(p => !p.destinationId); return list.length ? <section className="blk"><h3>Elsewhere</h3><ul className="sheet">{list.map(p => <PinItem key={p.id} p={p} />)}</ul></section> : null; })()}
      {!pins.length && <Empty>No pins for that filter.</Empty>}
    </>
  );
}

function PinItem({ p, away }: { p: Place; away?: number }) {
  const { ix, edit } = useApp();
  return (
    <li>
      <div className="item-h"><span className="item-n"><span className="dot" style={pinColor(pinGroup(p).color)} />{p.name}</span><Pill>{p.wishlist ? 'Wishlist' : KIND_LABEL[p.kind]}</Pill></div>
      <Txt text={p.notes} className="item-d" />
      <div className="meta">{away != null && <span>{fmtDist(away)} away</span>}<Ext href={mapsLink(ix, p)}>Open in Google Maps</Ext><button className="linkbtn" onClick={() => edit({ kind: 'place', id: p.id })}>Edit</button></div>
    </li>
  );
}
