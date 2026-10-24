import { describe, expect, it } from 'vitest';
import { cleanFound, readWanted } from '../../supabase/functions/_shared/details';

describe('place details (Essentials)', () => {
  const wanted = readWanted([{ id: 's-kyo', kind: 'stay', name: 'Hotel Gracery Kyoto', city: 'Kyoto', country: 'JP' }, { id: 'x' }, 'junk']);
  it('takes only places with an id and a name', () => {
    expect(wanted.map(w => w.id)).toEqual(['s-kyo']);
  });
  it('keeps answers only for places asked about, and only real phone numbers', () => {
    const got = cleanFound({ places: [
      { id: 's-kyo', name: null, address: ' 1 Shijo-dori, Kyoto ', phone: '+81 75-123-4567', website: 'https://example.com', checkIn: '15:00', checkOut: '11 AM' },
      { id: 'other', address: 'Somewhere', phone: '+1 555 0100' },
    ] }, wanted);
    expect(got).toEqual([{ id: 's-kyo', name: null, address: '1 Shijo-dori, Kyoto', phone: '+81 75-123-4567', website: 'https://example.com', checkIn: '15:00', checkOut: null }]);
    expect(cleanFound({ places: [{ id: 's-kyo', address: null, phone: 'call the front desk' }] }, wanted))
      .toEqual([{ id: 's-kyo', name: null, address: null, phone: null, website: null, checkIn: null, checkOut: null }]);
  });
});
