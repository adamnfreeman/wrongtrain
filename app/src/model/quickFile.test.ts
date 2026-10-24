import { describe, expect, it } from 'vitest';
import { needsClaude, quickFiling } from './quickFile';
import { makeSample } from './sample';

const trip = makeSample(new Date('2026-10-24T00:00:00Z'));

describe('filing on the phone', () => {
  it('keeps plain tasks and named places, sends anything about when, bookings or searches to Claude', () => {
    expect(needsClaude('buy a Suica card')).toBe(false);
    expect(needsClaude('add Ichiran to Osaka')).toBe(false);
    expect(needsClaude('dinner at Ichiran on day 3')).toBe(true);
    expect(needsClaude('book teamLab for Tuesday')).toBe(true);
    expect(needsClaude('find a good sushi place near the hotel')).toBe(true);
    expect(needsClaude('our flight home is JL 4 at 7:45')).toBe(true);
  });
  it('turns the answer into a to-do or an idea in its city, or nothing when unsure', () => {
    const todo = quickFiling(trip, { kind: 'todo', text: 'Buy a Suica card', placeKind: '', city: '' });
    expect(todo?.changes[0]).toMatchObject({ type: 'todo', text: 'Buy a Suica card' });
    const osaka = trip.destinations.find(d => d.name === 'Osaka')!;
    const place = quickFiling(trip, { kind: 'place', text: 'Ichiran', placeKind: 'food', city: 'osaka' });
    expect(place?.changes[0]).toMatchObject({ type: 'place', name: 'Ichiran', kind: 'food', destinationId: osaka.id, wishlist: true });
    expect(quickFiling(trip, { kind: 'place', text: 'Somewhere', placeKind: 'food', city: 'Paris' })).toBeNull();
    expect(quickFiling(trip, { kind: 'other', text: 'hmm', placeKind: '', city: '' })).toBeNull();
  });
});
