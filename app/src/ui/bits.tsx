/* Small pieces every screen uses. */
import { type CSSProperties, type ReactNode, useState } from 'react';
import type { LineKey } from '../model/trip';

/** Inline style that sets the line colour for a block and everything inside it. */
export const line = (k: LineKey): CSSProperties => ({ ['--line' as string]: `var(--l-${k})` });
export const pinColor = (token: string): CSSProperties => ({ ['--pc' as string]: `var(${token})` });

const TM = /\b\d{1,2}(?::\d{2})?(?:\s?[–-]\s?\d{1,2}(?::\d{2})?)?\s?(?:AM|PM)\b/g;

/** Text with clock times set in bold tabular figures. */
export function Rich({ text }: { text: string }) {
  const out: ReactNode[] = [];
  let i = 0, k = 0;
  for (const m of text.matchAll(TM)) {
    out.push(text.slice(i, m.index), <span className="tm" key={k++}>{m[0]}</span>);
    i = m.index! + m[0].length;
  }
  out.push(text.slice(i));
  return <>{out}</>;
}

/** A paragraph that folds to three lines when long, with a More button. */
export function Txt({ text, className }: { text?: string; className?: string }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  if (text.length <= 170) return <p className={className}><Rich text={text} /></p>;
  return (
    <div className={'cl' + (open ? ' open' : '')}>
      <p className={'clamp ' + (className || '')}><Rich text={text} /></p>
      <button className="more" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? 'Less' : 'More'}</button>
    </div>
  );
}

export const Ext = ({ href, children }: { href: string; children: ReactNode }) =>
  <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;

export const Pill = ({ kind = '', children }: { kind?: '' | 'ok' | 'todo' | 'no'; children: ReactNode }) =>
  <span className={'pill ' + kind}>{children}</span>;

export function SecH({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="sec-h"><h2>{title}</h2>{children}</div>;
}

export function Fold({ title, count, note, children, open }: { title: string; count?: ReactNode; note?: string; children: ReactNode; open?: boolean }) {
  return (
    <details className="fold" open={open}>
      <summary>{title}{count != null && <span className="count">{count}</span>}</summary>
      {note && <p className="note">{note}</p>}
      {children}
    </details>
  );
}

export const Empty = ({ children }: { children: ReactNode }) => <p className="empty">{children}</p>;
