/* Form pieces for the editors: a full-screen sheet with Cancel and Save, labelled fields, a time
   zone picker, line colour swatches, and a map you tap to drop a pin. */
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import L from 'leaflet';
import { LINE_COLORS, type LineColor } from '../model/types';
import { parseCoords } from '../model/edit';

export function Sheet({ title, onCancel, onSave, saveLabel = 'Save', cancelLabel = 'Cancel', canSave = true, children, footer }: {
  title: string; onCancel: () => void; onSave?: () => void; saveLabel?: string; cancelLabel?: string; canSave?: boolean; children: ReactNode; footer?: ReactNode;
}) {
  useEffect(() => {
    const y = window.scrollY;
    document.body.classList.add('sheet-open');
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', key);
    return () => { document.body.classList.remove('sheet-open'); window.removeEventListener('keydown', key); window.scrollTo(0, y); };
  }, [onCancel]);
  return createPortal(
    <div className="sheet-wrap" role="dialog" aria-modal="true" aria-label={title}>
      <header className="sheet-bar">
        <button className="linkbtn" onClick={onCancel}>{cancelLabel}</button>
        <h2>{title}</h2>
        {onSave ? <button className="linkbtn strong" disabled={!canSave} onClick={onSave}>{saveLabel}</button> : <span />}
      </header>
      <div className="sheet-body">
        {children}
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Field({ label, hint, children, id }: { label: string; hint?: ReactNode; children: ReactNode; id?: string }) {
  return (
    <div className="field">
      <label className="flabel" htmlFor={id}>{label}</label>
      {children}
      {hint && <p className="fhint">{hint}</p>}
    </div>
  );
}

export function Text({ label, value, onChange, hint, placeholder, multiline, type = 'text', autoFocus }: {
  label: string; value: string; onChange: (v: string) => void; hint?: ReactNode; placeholder?: string; multiline?: boolean;
  /** decimal: money and rates, with the keypad that has a decimal point */
  type?: 'text' | 'date' | 'time' | 'url' | 'number' | 'decimal'; autoFocus?: boolean;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} id={id}>
      {multiline
        ? <textarea id={id} className="input area" rows={3} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} autoFocus={autoFocus} />
        : <input id={id} className="input" type={type === 'decimal' ? 'text' : type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} autoFocus={autoFocus}
            inputMode={type === 'number' ? 'numeric' : type === 'decimal' ? 'decimal' : undefined} />}
    </Field>
  );
}

export function Choice<T extends string>({ label, value, onChange, options, hint }: {
  label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; hint?: ReactNode;
}) {
  const id = useId();
  return (
    <Field label={label} hint={hint} id={id}>
      <select id={id} className="input" value={value} onChange={e => onChange(e.target.value as T)}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

export function Check({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: ReactNode }) {
  return (
    <label className="fcheck">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span><b>{label}</b>{hint && <span className="fhint">{hint}</span>}</span>
    </label>
  );
}

/** Buttons that act like a single choice, for short option lists. */
export function Segs<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="field">
      <span className="flabel">{label}</span>
      <div className="chips" style={{ marginTop: 0 }} role="group" aria-label={label}>
        {options.map(o => <button type="button" key={o.value} className="chipbtn plain" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>)}
      </div>
    </div>
  );
}

/* ---------- time zones ---------- */

function allZones(): string[] {
  try { return (Intl as unknown as { supportedValuesOf(k: string): string[] }).supportedValuesOf('timeZone'); } catch { return []; }
}
export const phoneZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
/** "Asia/Tokyo" → "Tokyo (Asia)" */
export const zoneLabel = (z: string) => { const p = z.split('/'); return p.length > 1 ? `${p[p.length - 1].replace(/_/g, ' ')} (${p[0]})` : z; };

/** Best guess at a time zone from a place name: "Tokyo" → Asia/Tokyo, "New York" → America/New_York. */
export function guessZone(name: string): string | null {
  const n = name.trim().toLowerCase().replace(/\s+/g, '_');
  if (n.length < 3) return null;
  return allZones().find(z => z.toLowerCase().endsWith('/' + n)) || null;
}

export function ZonePicker({ value, onChange, label = 'Time zone' }: { value: string; onChange: (v: string) => void; label?: string }) {
  const zones = useMemo(allZones, []);
  const [q, setQ] = useState('');
  const id = useId();
  const shown = q.trim() ? zones.filter(z => z.toLowerCase().replace(/_/g, ' ').includes(q.trim().toLowerCase())).slice(0, 40) : [];
  if (!zones.length) return <Text label={label} value={value} onChange={onChange} hint="An IANA time zone, like Asia/Tokyo." />;
  return (
    <Field label={label} id={id} hint={<>Now: <b>{zoneLabel(value)}</b>. Search by a big city in the same zone.</>}>
      <input id={id} className="input" type="search" placeholder="Search, e.g. Tokyo or Paris" value={q} onChange={e => setQ(e.target.value)} />
      {shown.length > 0 && (
        <div className="zlist" role="listbox" aria-label="Matching time zones">
          {shown.map(z => <button type="button" key={z} role="option" aria-selected={z === value} className="zopt" onClick={() => { onChange(z); setQ(''); }}>{zoneLabel(z)}</button>)}
        </div>
      )}
    </Field>
  );
}

/* ---------- line colours ---------- */

export function Swatches({ value, onChange, used = [] }: { value: LineColor; onChange: (c: LineColor) => void; used?: LineColor[] }) {
  return (
    <div className="field">
      <span className="flabel">Line colour</span>
      <div className="swatches" role="radiogroup" aria-label="Line colour">
        {LINE_COLORS.map(c => (
          <button type="button" key={c} role="radio" aria-checked={value === c} aria-label={c + (used.includes(c) && value !== c ? ' (in use)' : '')}
            className="swatch" style={{ ['--line' as string]: `var(--l-${c})` }} onClick={() => onChange(c)} />
        ))}
      </div>
    </div>
  );
}

/* ---------- pin on a map ---------- */

export function PinPicker({ lat, lng, onChange, near }: {
  lat?: number; lng?: number; onChange: (p: { lat?: number; lng?: number }) => void; near?: [number, number][];
}) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const mark = useRef<L.CircleMarker | null>(null);
  const [paste, setPaste] = useState('');
  const [msg, setMsg] = useState('');
  const has = lat != null && lng != null;
  const cb = useRef(onChange);
  useEffect(() => { cb.current = onChange; });

  useEffect(() => {
    if (!el.current) return;
    const m = L.map(el.current, { scrollWheelZoom: false });
    map.current = m;
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(m);
    if (lat != null && lng != null) m.setView([lat, lng], 15);
    else if (near?.length) m.fitBounds(L.latLngBounds(near), { padding: [20, 20], maxZoom: 14 });
    else m.setView([20, 0], 2);
    m.on('click', e => cb.current({ lat: +e.latlng.lat.toFixed(6), lng: +e.latlng.lng.toFixed(6) }));
    return () => { m.remove(); map.current = null; mark.current = null; };
  }, []);

  useEffect(() => {
    const m = map.current; if (!m) return;
    if (!has) { mark.current?.remove(); mark.current = null; return; }
    const c = getComputedStyle(document.documentElement).getPropertyValue('--l-red').trim();
    if (mark.current) mark.current.setLatLng([lat!, lng!]);
    else mark.current = L.circleMarker([lat!, lng!], { radius: 9, color: '#fff', weight: 3, fillColor: c, fillOpacity: 1 }).addTo(m);
  }, [has, lat, lng]);

  const usePaste = (v: string) => {
    setPaste(v);
    if (!v.trim()) return setMsg('');
    const p = parseCoords(v);
    if (p) { onChange(p); map.current?.setView([p.lat, p.lng], 16); setMsg('Pin set from what you pasted.'); setPaste(''); }
    else setMsg(/goo\.gl|maps\.app/.test(v) ? 'Short share links have no coordinates in them. In Google Maps, long-press the spot and copy the numbers at the top instead.' : 'No coordinates found in that.');
  };

  return (
    <div className="field">
      <span className="flabel">Map pin</span>
      <div className="map pinmap" ref={el} aria-label="Tap the map to place the pin" />
      <p className="fhint">{has ? <>Pin at {lat!.toFixed(5)}, {lng!.toFixed(5)}. Tap the map to move it. <button type="button" className="linkbtn" onClick={() => onChange({ lat: undefined, lng: undefined })}>Remove pin</button></> : 'Tap the map to drop a pin, or paste coordinates or a Google Maps link below.'}</p>
      <input className="input" style={{ marginTop: 8 }} placeholder="Paste coordinates or a maps link" value={paste} onChange={e => usePaste(e.target.value)} aria-label="Paste coordinates or a maps link" />
      {msg && <p className="fhint">{msg}</p>}
    </div>
  );
}

/** A list of short text lines you can add to, edit and remove. */
export function Lines({ label, items, onChange, placeholder, hint }: { label: string; items: string[]; onChange: (v: string[]) => void; placeholder?: string; hint?: ReactNode }) {
  return (
    <div className="field">
      <span className="flabel">{label}</span>
      {hint && <p className="fhint" style={{ marginTop: 0, marginBottom: 6 }}>{hint}</p>}
      <div className="lines">
        {items.map((t, i) => (
          <div key={i} className="lrow">
            <textarea className="input area sm" rows={2} value={t} placeholder={placeholder} aria-label={`${label} ${i + 1}`}
              onChange={e => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
            <button type="button" className="iconbtn" aria-label={`Remove ${label.toLowerCase()} ${i + 1}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <button type="button" className="linkbtn" onClick={() => onChange([...items, ''])}>+ Add</button>
      </div>
    </div>
  );
}

/** Danger-zone button that asks first. */
export function DeleteButton({ label, confirmText, onDelete }: { label: string; confirmText: string; onDelete: () => void }) {
  return <button type="button" className="dangerbtn" onClick={() => { if (confirm(confirmText)) onDelete(); }}>{label}</button>;
}
