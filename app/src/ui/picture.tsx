/* A picture or PDF shown full screen inside the app: tickets, bookings and IDs open right here
   instead of in another app. "Save or share" hands the file to the phone when wanted. */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Doc } from '../model/types';
import { openFile, useFileUrl } from '../sync/files';

export function PictureView({ src, title, close, pdf, onShare }: { src: string; title: string; close: () => void; pdf?: boolean; onShare?: () => void }) {
  return createPortal(
    <div className="pview" role="dialog" aria-label={title}>
      <div className="pview-bar">
        <button className="linkbtn" onClick={close}>Close</button>
        <span>{title}</span>
        {onShare ? <button className="linkbtn" onClick={onShare}>Save or share</button> : <span />}
      </div>
      <div className="pview-img">{pdf ? <iframe className="pview-pdf" src={src} title={title} /> : <ZoomImg src={src} alt={title} />}</div>
    </div>,
    document.body,
  );
}

/** A ticket or document that is a file, opened right here full screen (pictures and PDFs), with
    "Save or share" for the phone; anything else goes to the phone's own viewer. */
export function FileTicket({ d, close, onError }: { d: Doc; close: () => void; onError: (m: string) => void }) {
  const kind = d.file!.type.startsWith('image/') ? 'image' : d.file!.type === 'application/pdf' ? 'pdf' : '';
  const { url, missing } = useFileUrl(kind ? d.file!.path : undefined);
  const other = !kind || missing;
  const share = () => { void openFile(d.file!.path, d.file!.name).catch(e => onError((e as Error).message)); };
  useEffect(() => { if (other) void openFile(d.file!.path, d.file!.name).catch(e => onError((e as Error).message)).finally(close); }, [other]); // eslint-disable-line react-hooks/exhaustive-deps
  return !other && url ? <PictureView src={url} title={d.title} pdf={kind === 'pdf'} onShare={share} close={close} /> : null;
}

/** A picture you can pinch to zoom, and drag around once zoomed; let go zoomed right out and it
    settles back. A double tap zooms in and out, unless onDoubleTap does something else (a heart on
    Photos). A quick swipe while not zoomed calls onSwipe, so moving between photos still works. */
export function ZoomImg({ src, alt, onSwipe, onDoubleTap }: { src: string; alt: string; onSwipe?: (dir: 1 | -1) => void; onDoubleTap?: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [z, setZ] = useState({ s: 1, x: 0, y: 0 });
  const zr = useRef(z); zr.current = z;
  useEffect(() => { setZ({ s: 1, x: 0, y: 0 }); }, [src]);
  const cb = useRef({ onSwipe, onDoubleTap }); cb.current = { onSwipe, onDoubleTap };
  useEffect(() => {
    const el = box.current; if (!el) return;
    let start: { d: number; s: number; mx: number; my: number; x: number; y: number; t: number; one: boolean } | null = null;
    let moved = false, lastTap = 0;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const mid = (t: TouchList) => (t.length > 1 ? { x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 } : { x: t[0].clientX, y: t[0].clientY });
    /* how far it may be dragged at this zoom, so the picture can't be lost off the screen */
    const clamp = (v: { s: number; x: number; y: number }) => {
      const mx = (el.clientWidth * (v.s - 1)) / 2, my = (el.clientHeight * (v.s - 1)) / 2;
      return { s: v.s, x: Math.max(-mx, Math.min(mx, v.x)), y: Math.max(-my, Math.min(my, v.y)) };
    };
    const down = (e: TouchEvent) => {
      const m = mid(e.touches), c = zr.current;
      start = { d: e.touches.length > 1 ? dist(e.touches) : 0, s: c.s, mx: m.x, my: m.y, x: c.x, y: c.y, t: Date.now(), one: e.touches.length === 1 };
      moved = false;
    };
    const move = (e: TouchEvent) => {
      if (!start) return;
      const m = mid(e.touches);
      if (Math.abs(m.x - start.mx) > 8 || Math.abs(m.y - start.my) > 8) moved = true;
      if (e.touches.length > 1) {
        e.preventDefault();
        if (!start.d) { start = { ...start, d: dist(e.touches), s: zr.current.s, mx: m.x, my: m.y, x: zr.current.x, y: zr.current.y, one: false }; return; }
        const s = Math.max(1, Math.min(5, (start.s * dist(e.touches)) / start.d));
        setZ(clamp({ s, x: start.x + (m.x - start.mx), y: start.y + (m.y - start.my) }));
      } else if (zr.current.s > 1.01) {
        e.preventDefault();
        setZ(clamp({ s: zr.current.s, x: start.x + (m.x - start.mx), y: start.y + (m.y - start.my) }));
      }
    };
    const up = (e: TouchEvent) => {
      if (!start || e.touches.length) return;
      const c = zr.current;
      if (c.s < 1.05) setZ({ s: 1, x: 0, y: 0 });
      const end = e.changedTouches[0], dx = end.clientX - start.mx;
      if (start.one && c.s < 1.05 && Math.abs(dx) > 60 && Date.now() - start.t < 600) cb.current.onSwipe?.(dx < 0 ? 1 : -1);
      else if (start.one && !moved && Date.now() - start.t < 250) {
        const now = Date.now();
        if (now - lastTap < 300) {
          lastTap = 0;
          if (cb.current.onDoubleTap) cb.current.onDoubleTap();
          else setZ(c.s > 1.05 ? { s: 1, x: 0, y: 0 } : { s: 2.5, x: 0, y: 0 });
        } else lastTap = now;
      }
      start = null;
    };
    el.addEventListener('touchstart', down, { passive: true });
    el.addEventListener('touchmove', move, { passive: false });
    el.addEventListener('touchend', up);
    return () => { el.removeEventListener('touchstart', down); el.removeEventListener('touchmove', move); el.removeEventListener('touchend', up); };
  }, []);
  return (
    <div ref={box} className="zoombox" onDoubleClick={() => (onDoubleTap ? onDoubleTap() : setZ(z.s > 1.05 ? { s: 1, x: 0, y: 0 } : { s: 2.5, x: 0, y: 0 }))}>
      <img src={src} alt={alt} draggable={false} style={{ transform: `translate(${z.x}px, ${z.y}px) scale(${z.s})` }} />
    </div>
  );
}
