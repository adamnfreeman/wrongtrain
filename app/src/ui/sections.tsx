/* The five tabs' insides (Nov 24): Plan holds Days and Bookings, Map holds the map and Places, Group
   holds the trip, To do, Photos and Notes, each picked at the top of the page (SUBS in ctx.tsx). And
   Today's tools: Convert, Phrases, Emergency, each opening over the page. */
import type { ReactNode } from 'react';
import { SUBS, type Tab, type Tool } from './ctx';
import { useApp } from './ctx';
import { Days, Places, Prep } from './views';
import { Essentials, Emergency } from './essentials';
import { MapView } from './map';
import { TripHub } from './trip';
import { PhotosPage } from './photos';
import { MyNotes } from './mynotes';
import { Phrases } from './phrases';
import { Converter } from './wallet';
import { Sheet } from './form';
import { tripCurrency } from '../model/money';
import { JAPAN } from '../edition';

/** The page picked inside a tab (each tab keeps its own, open or not), else its first. */
function useMine(tab: Tab): Tab {
  const { ui } = useApp();
  const subs = SUBS[tab] || [];
  const s = ui.sub[tab];
  return s && subs.some(x => x.id === s) ? s : subs[0]?.id || tab;
}

/** The pages inside a tab, as a row of tabs at the top. */
function SubTabs({ tab }: { tab: Tab }) {
  const { go } = useApp();
  const mine = useMine(tab);
  return (
    <div className="seg subtabs" role="tablist" aria-label="Pages">
      {(SUBS[tab] || []).map(s => (
        <button key={s.id} role="tab" aria-selected={mine === s.id} aria-pressed={mine === s.id} data-sub={s.id}
          onClick={() => go(s.id)}>{s.label}</button>
      ))}
    </div>
  );
}

/** A tab with pages inside: the row at the top, then the page picked. */
function Holder({ tab, pages }: { tab: Tab; pages: Partial<Record<Tab, () => ReactNode>> }) {
  const mine = useMine(tab);
  const Page = pages[mine] || Object.values(pages)[0]!;
  return (
    <>
      <SubTabs tab={tab} />
      <div className="subpage" data-sub={mine}><Page /></div>
    </>
  );
}

export const PlanPage = () => <Holder tab="days" pages={{ days: Days, essentials: Essentials }} />;
export const MapPage = () => <Holder tab="map" pages={{ map: MapView, places: Places }} />;
export const GroupPage = () => <Holder tab="trip" pages={{ trip: TripHub, prep: Prep, ...(JAPAN ? {} : { photos: PhotosPage }), notes: MyNotes }} />;

const TOOLS: { id: Tool; label: string; icon: ReactNode }[] = [
  { id: 'convert', label: 'Convert', icon: <><circle cx="12" cy="12" r="8.5" /><path d="M14.5 9.2c-.6-.9-1.5-1.3-2.6-1.3-1.5 0-2.6.8-2.6 2s1 1.7 2.7 2.1c1.8.4 2.8 1 2.8 2.3 0 1.3-1.2 2.1-2.8 2.1-1.2 0-2.2-.5-2.8-1.4M12 6.2v1.7M12 16.4v1.7" /></> },
  { id: 'phrases', label: 'Phrases', icon: <><path d="M4 5h16v11H10l-4.5 3.5V16H4z" /><path d="M8.5 9.5h7M8.5 12.5h4.5" /></> },
  { id: 'sos', label: 'Emergency', icon: <><path d="M12 3.5 3 19.5h18z" /><path d="M12 10v4.5M12 17.2v.3" /></> },
];

/** Today's tools: one tap to the things you reach for in a hurry (Adam: swiping to the currency
    converter every time was too much). */
export function Tools() {
  const { ix, set } = useApp();
  const tools = TOOLS.filter(t => (t.id !== 'convert' || !JAPAN) && (t.id !== 'sos' || ix.trip.destinations.some(d => d.country)));
  return (
    <div className="tools" role="group" aria-label="Tools">
      {tools.map(t => (
        <button key={t.id} type="button" className="tool" onClick={() => set({ tool: t.id })}>
          <svg viewBox="0 0 24 24" aria-hidden="true">{t.icon}</svg><span>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

/** The open tool, over the page. */
export function ToolSheet() {
  const { ix, ui, set } = useApp();
  const close = () => set({ tool: null });
  if (!ui.tool) return null;
  const countries = [...new Set(ix.trip.destinations.map(d => d.country).filter(Boolean))];
  const title = TOOLS.find(t => t.id === ui.tool)?.label || '';
  return (
    <Sheet title={title} onCancel={close} cancelLabel="Done">
      <div className="toolbody">
        {ui.tool === 'convert' && <Converter trip={ix.trip} home={tripCurrency(ix.trip)} />}
        {ui.tool === 'phrases' && <Phrases />}
        {ui.tool === 'sos' && <Emergency countries={countries} />}
      </div>
    </Sheet>
  );
}
