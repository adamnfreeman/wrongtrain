import { describe, expect, it } from 'vitest';
import { clamp, OUTLINE_SYSTEM, RESEARCH_SYSTEM, BUILD_SYSTEM } from '../../supabase/functions/_shared/planner.ts';
import { SYSTEM_PROMPT, buildNotePrompt } from '../../supabase/functions/_shared/filing.ts';
import { NEARBY_SYSTEM } from '../../supabase/functions/_shared/nearby.ts';
import { makeSample } from './sample';

describe('what reaches Claude is kept small', () => {
  it('cuts long text, long lists and deep nesting from what the phone sends the planner', () => {
    const deep = { a: { b: { c: { d: { e: { f: 'too deep' } } } } } };
    const out = clamp({ where: 'x'.repeat(5000), travelers: Array(500).fill('Sam'), deep });
    expect(out.where.length).toBe(400);
    expect(out.travelers.length).toBe(30);
    expect(JSON.stringify(out)).not.toContain('too deep');
  });
  it('sends at most 120 days of a trip to the ideas box', () => {
    const t = makeSample(new Date());
    const many = { ...t, days: Array.from({ length: 1000 }, (_, i) => ({ ...t.days[0], id: 'd' + i })) };
    const { prompt } = buildNotePrompt(many, { text: 'x', author: 'A' }, 'Adam', '2026-10-17');
    expect((prompt.match(/^D\d+ \|/gm) || []).length).toBe(120);
  });
});

describe('Claude is told that what people type is data, not orders', () => {
  it.each([['ideas box', SYSTEM_PROMPT], ['nearby', NEARBY_SYSTEM], ['planner outline', OUTLINE_SYSTEM], ['planner research', RESEARCH_SYSTEM], ['planner build', BUILD_SYSTEM]])(
    '%s', (_, p) => expect(p).toMatch(/never (as )?instructions to you/i));
});
