import { describe, expect, it } from 'vitest';
import { candidatesFrom, cleanPicks, isMood, nearbyPrompt, overpassQuery, type OsmElement } from '../../supabase/functions/_shared/nearby.ts';

const here = { lat: 38.7139, lng: -9.1394 };
const osm: { elements: OsmElement[] } = {
  elements: [
    { type: 'node', id: 1, lat: 38.7140, lon: -9.1395, tags: { amenity: 'restaurant', name: 'Tasca do Chico', cuisine: 'portuguese', opening_hours: 'Mo-Su 19:00-02:00' } },
    { type: 'way', id: 2, center: { lat: 38.7200, lon: -9.1400 }, tags: { amenity: 'restaurant', name: 'Far Away' } },
    { type: 'node', id: 3, lat: 38.7141, lon: -9.1396, tags: { amenity: 'fast_food', name: 'tasca do chico' } },
    { type: 'node', id: 4, lat: 38.7139, lon: -9.1390, tags: { amenity: 'restaurant' } },
    { type: 'node', id: 5, lat: 38.7139, lon: -9.1391, tags: { shop: 'mall', name: 'Armazéns', 'name:en': 'Warehouses' } },
  ],
};

describe('overpassQuery', () => {
  it('asks for named places of the mood around you', () => {
    const q = overpassQuery('film', here.lat, here.lng, 1200);
    expect(q).toContain('nwr["amenity"~"^cinema$"]["name"](around:1200,38.71390,-9.13940);');
    expect(q).toContain('[out:json]');
    expect(q).toContain('out center');
  });
  it('covers each tag set a mood has', () => {
    expect(overpassQuery('coffee', 0, 0, 500).match(/nwr\[/g)).toHaveLength(2);
  });
});

describe('candidatesFrom', () => {
  const c = candidatesFrom(osm, here.lat, here.lng);
  it('keeps named places, nearest first, one per name', () => {
    expect(c.map(x => x.name)).toEqual(['Tasca do Chico', 'Warehouses', 'Far Away']);
  });
  it('says what each is, with distance and hours', () => {
    const t = c.find(x => x.name === 'Tasca do Chico')!;
    expect(t.what).toBe('Restaurant · portuguese');
    expect(t.hours).toBe('Mo-Su 19:00-02:00');
    expect(t.dist).toBeLessThan(20);
    expect(c[1].what).toBe('Shopping mall');
  });
  it('uses the centre of buildings and areas', () => {
    expect(c.find(x => x.id === 'way/2')!.lat).toBe(38.72);
  });
});

describe('Claude’s picks', () => {
  const c = candidatesFrom(osm, here.lat, here.lng);
  it('keep only real candidates, once each, at most five', () => {
    const p = cleanPicks({ picks: [{ id: 'node/1', why: 'Close and open late.' }, { id: 'node/999', why: 'Made up' }, { id: 'node/1', why: 'again' }] }, c);
    expect(p).toEqual([{ id: 'node/1', why: 'Close and open late.' }]);
    expect(cleanPicks({ nope: 1 }, c)).toEqual([]);
  });
  it('the prompt carries the mood, the time and the places', () => {
    const s = nearbyPrompt('food', 'Fri 21:30', c);
    expect(s).toMatch(/Mood: Food/);
    expect(s).toMatch(/Fri 21:30/);
    expect(s).toMatch(/node\/1 \| Tasca do Chico \| Restaurant · portuguese \| \d+ m \| hours: Mo-Su 19:00-02:00/);
  });
  it('moods are checked', () => {
    expect(isMood('food')).toBe(true);
    expect(isMood('drop table')).toBe(false);
  });
});
