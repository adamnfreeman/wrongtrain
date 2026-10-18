/* Pull down to refresh, on every page: at the top of a page, pull down and let go, and the trip
   is fetched fresh from the group (pullAll), with its photos, hearts and comments. The Japan
   edition reads the sheet again (it listens for 'wt-refresh', ui/japan.tsx). A label at the top
   says what will happen and then what did. */
import { useEffect, type RefObject } from 'react';
import { pullAll } from '../sync/engine';
import { refresh as refreshPhotos } from '../sync/photos';

const PULL = 70;

export function usePullToRefresh(pager: RefObject<HTMLElement | null>, label: RefObject<HTMLElement | null>, tripId: string) {
  useEffect(() => {
    const pg = pager.current, el = label.current;
    if (!pg || !el) return;
    let y0 = 0, x0 = 0, dy = 0, on = false, busy = false, hide = 0;
    const show = (text: string, state: string) => { clearTimeout(hide); el.textContent = text; el.dataset.state = state; };
    const start = (e: TouchEvent) => {
      const pane = (e.target as HTMLElement).closest('.pane') as HTMLElement | null;
      on = !busy && !!pane && pane.scrollTop <= 0 && !(e.target as HTMLElement).closest('[data-noswipe], .tabs, .sheet-wrap, .pview, .leaflet-container');
      y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; dy = 0;
    };
    const move = (e: TouchEvent) => {
      if (!on) return;
      const ddy = e.touches[0].clientY - y0, ddx = Math.abs(e.touches[0].clientX - x0);
      if (ddx > Math.abs(ddy)) { on = false; el.dataset.state = ''; return; } // a sideways swipe turns the page instead
      dy = ddy;
      if (dy > 12) show(dy > PULL ? 'Let go to refresh' : 'Pull to refresh', dy > PULL ? 'ready' : 'pull');
      else el.dataset.state = '';
    };
    const end = async () => {
      if (!on) return;
      on = false;
      if (dy <= PULL) { el.dataset.state = ''; return; }
      busy = true; show('Refreshing…', 'busy');
      window.dispatchEvent(new Event('wt-refresh'));
      const ok = navigator.onLine;
      await Promise.allSettled([pullAll(), refreshPhotos(tripId)]);
      busy = false;
      show(ok ? 'Up to date' : 'No signal: showing what this phone has', ok ? 'done' : 'bad');
      hide = window.setTimeout(() => { el.dataset.state = ''; }, 1400);
    };
    pg.addEventListener('touchstart', start, { passive: true });
    pg.addEventListener('touchmove', move, { passive: true });
    pg.addEventListener('touchend', end);
    return () => { pg.removeEventListener('touchstart', start); pg.removeEventListener('touchmove', move); pg.removeEventListener('touchend', end); clearTimeout(hide); };
  }, [pager, label, tripId]);
}
