/* Push notifications: who a reminder or an alert is for, what it says, and the signed token Apple
   (APNs) wants. Shared by the send-push function and the app's tests. */

type TodoLike = { id: string; text: string; done?: boolean; mine?: string; everyone?: boolean; who?: string[]; checks?: string[] };
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The names a "Remind" goes to: those it's for who haven't ticked it (everyone, for a group to-do
    nobody has ticked), never the person who sent it. Matches stillToDo in src/model/todos.ts. */
export function remindNames(t: TodoLike, travelers: string[], sender: string): string[] {
  if (t.done || t.mine) return [];
  const needs = t.everyone ? travelers : t.who?.length ? t.who : null;
  const left = needs ? needs.filter(n => !(t.checks || []).some(c => same(c, n))) : travelers;
  return left.filter(n => !same(n, sender));
}

/** What each kind of push says. Only these words go out: nobody can send their own text. */
export function message(kind: 'remind' | 'sharing', sender: string, todoText = ''): { title: string; body: string; tab: string } {
  return kind === 'remind'
    ? { title: `${sender || 'Someone'} reminded you`, body: todoText.slice(0, 180), tab: 'prep' }
    : { title: `${sender || 'Someone'} is sharing where they are`, body: 'See them on the Map in WrongTrain.', tab: 'map' };
}

const b64url = (b: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof b === 'string' ? new TextEncoder().encode(b) : new Uint8Array(b);
  let s = ''; for (const x of bytes) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/** The token APNs wants (ES256, valid for up to an hour), signed with the .p8 key from Apple. */
export async function apnsToken(p8: string, keyId: string, teamId: string, now = Math.floor(Date.now() / 1000)): Promise<string> {
  const der = Uint8Array.from(atob(p8.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64url(JSON.stringify({ alg: 'ES256', kid: keyId })), claims = b64url(JSON.stringify({ iss: teamId, iat: now }));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, new TextEncoder().encode(`${head}.${claims}`));
  return `${head}.${claims}.${b64url(sig)}`;
}
