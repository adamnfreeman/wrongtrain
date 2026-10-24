import { describe, expect, it } from 'vitest';
import { apnsToken, message, remindNames } from '../../supabase/functions/_shared/push';

describe('push notifications', () => {
  const people = ['Adam', 'Andrea', 'Andrew', 'Jared'];
  it('a reminder goes to whoever still has it to do, not the sender', () => {
    expect(remindNames({ id: 'a', text: 'Visit Japan Web', everyone: true, checks: ['andrea'] }, people, 'Adam')).toEqual(['Andrew', 'Jared']);
    expect(remindNames({ id: 'b', text: 'Book dinner', who: ['Jared'] }, people, 'Adam')).toEqual(['Jared']);
    expect(remindNames({ id: 'c', text: 'Done already', done: true }, people, 'Adam')).toEqual([]);
    expect(remindNames({ id: 'd', text: 'Just mine', mine: 'Adam' }, people, 'Andrea')).toEqual([]);
  });
  it('only fixed words go out', () => {
    expect(message('remind', 'Adam', 'Register on Visit Japan Web')).toEqual({ title: 'Adam reminded you', body: 'Register on Visit Japan Web', tab: 'prep' });
    expect(message('sharing', '').title).toBe('Someone is sharing where they are');
  });
  it('signs the APNs token so Apple can check it', async () => {
    const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
    const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
    const pem = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...der))}\n-----END PRIVATE KEY-----`;
    const jwt = await apnsToken(pem, 'ABC123XYZ9', 'GXSV7T4V36', 1_800_000_000);
    const [h, c, s] = jwt.split('.');
    const dec = (x: string) => JSON.parse(atob(x.replace(/-/g, '+').replace(/_/g, '/')));
    expect(dec(h)).toEqual({ alg: 'ES256', kid: 'ABC123XYZ9' });
    expect(dec(c)).toEqual({ iss: 'GXSV7T4V36', iat: 1_800_000_000 });
    const sig = Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), x => x.charCodeAt(0));
    expect(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pair.publicKey, sig, new TextEncoder().encode(`${h}.${c}`))).toBe(true);
  });
});
