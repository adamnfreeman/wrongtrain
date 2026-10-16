/* A small plan for test mode to replay before a real one has been made on this phone. */
import type { Answers, Outline, StopPlan } from '../../supabase/functions/_shared/planner.ts';

export const FIXTURE: { answers?: Answers; outline: Outline; stops: StopPlan[] } = {
  outline: {
    title: 'Osaka and Kyoto (test plan)', start: '2027-04-05', arrival: 'Fly into Kansai (KIX) and home from there.',
    summary: 'A short test plan: two nights eating in Osaka, two in Kyoto among the temples.',
    tips: ['Load an IC card (ICOCA) on your phone for trains and shops.', 'Book teamLab Botanical Garden Osaka ahead on weekends.'],
    stops: [
      { city: 'Osaka', country: 'JP', timeZone: 'Asia/Tokyo', nights: 2, why: 'Street food and late nights in Dotonbori.' },
      { city: 'Kyoto', country: 'JP', timeZone: 'Asia/Tokyo', nights: 2, why: 'Temples, gardens and quiet lanes.' },
    ],
    hops: [{ from: 'Osaka', to: 'Kyoto', mode: 'train', how: 'JR Special Rapid', duration: '30 min' }],
  },
  stops: [
    {
      hotels: [
        { name: 'Cross Hotel Osaka', area: 'Shinsaibashi', price: 3, why: 'Steps from Dotonbori.', link: null, pick: true },
        { name: 'Hotel The Flag Shinsaibashi', area: 'Shinsaibashi', price: 2, why: 'Simple and two streets away.', link: null, pick: false },
      ],
      places: [
        { key: 'p1', name: 'Kuromon Market', kind: 'food', area: 'Nipponbashi', notes: 'Grilled seafood and fruit stalls; go hungry before noon.', link: null, veg: false, bookAhead: false },
        { key: 'p2', name: 'Dotonbori', kind: 'area', area: 'Namba', notes: 'Neon canal street; takoyaki and okonomiyaki everywhere.', link: null, veg: true, bookAhead: false },
      ],
      days: [
        { date: '2027-04-05', title: 'Arrive in Osaka', summary: 'Check in, then Dotonbori after dark.', plan: [{ time: '19:00', text: 'Dinner along the canal', placeKey: 'p2', fixed: false }] },
        { date: '2027-04-06', title: 'Namba, at your own pace', summary: 'Pick as you go.', plan: [{ time: null, text: 'Breakfast at the market', placeKey: 'p1', fixed: false }] },
      ],
      around: ['From KIX take the Nankai Rapi:t to Namba, about 40 minutes.'], todos: [],
    },
    {
      hotels: [{ name: 'Hotel Kanra Kyoto', area: 'Shimogyo', price: 4, why: 'Calm, near the station.', link: null, pick: true }],
      places: [{ key: 'p1', name: 'Fushimi Inari Taisha', kind: 'sight', area: 'Fushimi', notes: 'Thousands of red gates; go at 7am to beat the crowds.', link: null, veg: false, bookAhead: false }],
      days: [
        { date: '2027-04-07', title: 'Arrive in Kyoto', summary: 'Settle in, wander Gion at dusk.', plan: [] },
        { date: '2027-04-08', title: 'Fushimi Inari', summary: 'An early start.', plan: [{ time: '07:00', text: 'Walk the gates', placeKey: 'p1', fixed: false }] },
      ],
      around: [], todos: [],
    },
  ],
};
