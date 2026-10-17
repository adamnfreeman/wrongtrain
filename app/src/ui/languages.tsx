/* "What they speak there": the languages at each destination (model/languages.ts). */
import { tripLanguages } from '../model/languages';
import { SecH } from './bits';
import { useApp } from './ctx';

const COUNTRY_NAME = (c: string) => { try { return new Intl.DisplayNames(['en'], { type: 'region' }).of(c) || c; } catch { return c; } };

export function Languages() {
  const { ix } = useApp();
  const list = tripLanguages(ix.trip.destinations.map(d => d.country));
  if (!list.length) return null;
  return (
    <section className="sec" id="languages">
      <SecH title="What they speak there" />
      <ul className="sheet">{list.map(({ country, langs }) => (
        <li key={country}>
          <div className="item-h"><span className="item-n">{COUNTRY_NAME(country)}: {langs.names}</span></div>
          {langs.regions && <p className="item-d">{langs.regions}</p>}
          <div className="meta"><span>English: {langs.english}</span></div>
        </li>
      ))}</ul>
    </section>
  );
}
