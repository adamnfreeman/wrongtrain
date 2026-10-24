import { describe, expect, it } from 'vitest';
import { nameMatch, osmAddress, pickOsm } from './osmDetails';
import type { Place } from './types';

const stay: Place = { id: 's', name: 'R&B Hotel Kyoto Shijo Kawaramachi', kind: 'stay', lat: 35.0012, lng: 135.7689 };
const json = { elements: [
  { lat: 35.00156, lon: 135.76974, tags: { name: 'Aoi Hotel Kyoto', tourism: 'hotel' } },
  { lat: 35.00119, lon: 135.76887, tags: { name: 'R&B Hotel Kyoto Shijo Kawaramachi', 'addr:housenumber': '258', 'addr:street': 'Ichinocho', 'addr:district': 'Shimogyo Ward', phone: '+81 75-222-0000;+81 75-222-0001', website: 'rb-hotels.jp' } },
] };

describe('free place details from OpenStreetMap', () => {
  it('matches names by their words, ignoring "hotel" and the city', () => {
    expect(nameMatch('Hotel Gracery Kyoto Sanjo', 'Gracery Kyoto Sanjo')).toBe(1);
    expect(nameMatch('Hotel Gracery Kyoto Sanjo', 'Aoi Hotel Kyoto')).toBe(0);
  });
  it('takes the address, first phone and website of the matching hotel', () => {
    expect(pickOsm(json, stay)).toEqual({ address: '258 Ichinocho, Shimogyo Ward', phone: '+81 75-222-0000', website: 'https://rb-hotels.jp' });
  });
  it('builds Japanese addresses from block and house numbers', () => {
    expect(osmAddress({ 'addr:block_number': '3', 'addr:housenumber': '12', 'addr:quarter': 'Nishiki', 'addr:city': 'Kyoto', 'addr:postcode': '604-8000' }))
      .toBe('3-12, Nishiki, Kyoto, 604-8000');
  });
  it('finds nothing rather than guess', () => {
    expect(pickOsm(json, { ...stay, name: 'Hotel Somewhere Else', lat: 35.01, lng: 135.78 })).toBeNull();
  });
});
