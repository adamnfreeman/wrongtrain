/* The Dock effect, for rows that scroll sideways (the day slider, the tab bar): each item grows as
   it nears the middle of the row and shrinks towards the edges, like the Dock on a Mac. Items
   read their size from --s. Off for people who have Reduce Motion on. */
import { useEffect, type RefObject } from 'react';

/** How far an element's middle is from the row's middle, in screen pixels (left is negative). */
export function offCentre(row: HTMLElement, el: HTMLElement): number {
  const a = row.getBoundingClientRect(), b = el.getBoundingClientRect();
  return b.left + b.width / 2 - (a.left + a.width / 2);
}

/** Sizes the row's items every frame while it moves: from small at radius pixels away, to big in the middle. */
export function useDock(ref: RefObject<HTMLElement | null>, items: string, { radius = 120, small = 0.86, big = 1.2, deps = [] as unknown[] } = {}) {
  useEffect(() => {
    const row = ref.current; if (!row) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const size = () => {
      frame = 0;
      row.querySelectorAll<HTMLElement>(items).forEach(el => {
        const near = Math.max(0, 1 - Math.abs(offCentre(row, el)) / radius);
        /* smoothstep, so the growth eases in and out */
        el.style.setProperty('--s', (small + (big - small) * near * near * (3 - 2 * near)).toFixed(3));
      });
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(size); };
    size();
    row.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { row.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(frame); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref, items, radius, small, big, ...deps]);
}

/** Scrolls a row so an item sits in the middle. */
export function centre(row: HTMLElement | null, el: HTMLElement | null | undefined, smooth = false) {
  if (!row || !el) return;
  row.scrollTo({ left: row.scrollLeft + offCentre(row, el), behavior: smooth ? 'smooth' : 'auto' });
}
