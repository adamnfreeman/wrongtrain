import { describe, expect, it } from 'vitest';
import { PACKS, packForTrip, packForZones } from './index';

describe('phrase packs', () => {
  it.each(Object.values(PACKS).map(p => [p.name, p] as const))('%s has the same groups as Japanese, each phrase complete', (_, p) => {
    expect(p.groups.map(g => g.cat)).toEqual(PACKS.ja.groups.map(g => g.cat));
    for (const g of p.groups) for (const x of g.items) {
      expect(x.en.trim()).not.toBe('');
      expect(x.ja.trim()).not.toBe('');
      expect(typeof x.ro).toBe('string');
    }
    expect(p.groups.reduce((n, g) => n + g.items.length, 0)).toBeGreaterThanOrEqual(45);
    expect(p.speechLang).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
  });
  it('a new trip gets the pack for its first stop with one', () => {
    expect(packForZones(['America/New_York', 'Europe/Paris', 'Europe/Rome'])).toBe('fr');
    expect(packForZones(['America/New_York'])).toBeUndefined();
  });
  it('a trip with no pack picked gets one from its destinations', () => {
    expect(packForTrip({ destinations: [{ country: 'PT' }] })?.lang).toBe('pt');
    expect(packForTrip({ destinations: [{ country: 'US' }, { timeZone: 'Asia/Seoul' }] })?.lang).toBe('ko');
  });
});
