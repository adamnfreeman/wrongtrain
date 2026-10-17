import { describe, expect, it } from 'vitest';
import { partnerCards } from './partners';

describe('referral links', () => {
  it('carry our ids, so bookings through them are credited', () => {
    const cards = partnerCards('Japan', 'Kyoto');
    const by = (id: string) => new URL(cards.find(c => c.id === id)!.url);
    expect(by('tours').searchParams.get('pid')).toBe('P00326374');
    expect(by('tours').searchParams.get('mcid')).toBe('42383');
    expect(by('rail').searchParams.get('aid')).toBe('139503');
    expect(by('insurance').searchParams.get('referenceID')).toBe('26619287');
  });
  it('the eSIM link stays plain until Airalo approves us', () => {
    expect(partnerCards('Japan').find(c => c.id === 'esim')!.url).toBe('https://www.airalo.com/japan-esim');
  });
});
