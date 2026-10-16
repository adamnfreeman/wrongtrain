/* Playing a phrase out loud.

   Recorded clips play through an ordinary audio element, which works on every phone, at full
   speed or slowed down with the pitch kept. Phrases without a clip use the phone's own voice
   for that language. Only one thing plays at a time; whoever asked last gets told when it stops. */
import type { Phrase, PhrasePack } from './types';

export type SayState = 'loading' | 'playing' | 'idle' | 'failed';
type Listener = (s: SayState) => void;

const clips: Record<string, { state: 'idle' | 'loading' | 'ready' | 'failed'; map: Record<string, string>; p?: Promise<void>; urls: Record<string, string> }> = {};
let audio: HTMLAudioElement | null = null;
let current: Listener | null = null;
let utter: SpeechSynthesisUtterance | null = null;   /* kept, or some browsers drop it mid-word */
let speakTimer = 0;

const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
const canSpeak = () => 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';

export function loadClips(pack: PhrasePack): Promise<void> {
  if (!pack.audio) return Promise.resolve();
  const c = clips[pack.lang] ||= { state: 'idle', map: {}, urls: {} };
  if (c.state !== 'idle') return c.p || Promise.resolve();
  c.state = 'loading';
  c.p = fetch(import.meta.env.BASE_URL + pack.audio)
    .then(r => { if (!r.ok) throw new Error('http'); return r.json(); })
    .then(j => { c.map = j.clips || {}; c.state = 'ready'; })
    .catch(() => { c.state = 'failed'; });
  return c.p;
}

function clipUrl(pack: PhrasePack, key: string): string | null {
  const c = clips[pack.lang]; if (!c) return null;
  if (c.urls[key]) return c.urls[key];
  const b = c.map[key]; if (!b) return null;
  const bin = atob(b), bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return (c.urls[key] = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' })));
}

function hand(l: Listener) {
  if (current && current !== l) current('idle');
  current = l;
}

export function play(pack: PhrasePack, it: Phrase, slow: boolean, on: Listener) {
  const key = it.tts || it.ja;
  hand(on);
  audio ||= Object.assign(new Audio(), { preload: 'auto' });
  const a = audio, rate = slow ? 0.65 : 1;
  const fail = () => { if (current === on) on('failed'); };
  const startClip = () => {
    const url = clipUrl(pack, key); if (!url) return false;
    try { if (canSpeak()) speechSynthesis.cancel(); } catch { /* ignore */ }
    a.onplaying = () => { a.playbackRate = rate; if (current === on) on('playing'); };
    a.onended = () => { if (current === on) on('idle'); };
    a.onerror = fail;
    a.pause(); a.src = url; a.defaultPlaybackRate = rate; a.playbackRate = rate;   /* some browsers reset the speed on a new source */
    a.preservesPitch = true;
    a.play()?.catch(fail);
    return true;
  };
  const c = clips[pack.lang];
  if (c?.state === 'ready') { if (!startClip()) speak(pack, key, slow, on); return; }
  if (!pack.audio || c?.state === 'failed') { speak(pack, key, slow, on); return; }
  /* clips still downloading: start a silent sound now so the phone lets this tap play audio a moment later */
  on('loading');
  try { a.src = SILENT; a.play()?.catch(() => {}); } catch { /* ignore */ }
  loadClips(pack).then(() => { if (current !== on) return; if (clips[pack.lang]?.state === 'ready' && startClip()) return; speak(pack, key, slow, on); });
}

/* the phone's own voices: prefer natural ones, never the novelty set that sounds like an old robot */
function pickVoice(lang: string): SpeechSynthesisVoice | null {
  const base = lang.split('-')[0];
  let v: SpeechSynthesisVoice[] = [];
  try { v = speechSynthesis.getVoices().filter(x => new RegExp('^' + base + '([-_]|$)', 'i').test(x.lang || '')); } catch { /* ignore */ }
  const bad = /Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley|Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|eSpeak/i;
  const good = [/Kyoko/i, /O-?ren/i, /Otoya/i, /Hattori/i, /Siri/i, /Google/i];
  for (const g of good) { const hit = v.find(x => g.test(x.name || '') && !bad.test(x.name || '')); if (hit) return hit; }
  return v.find(x => !bad.test(x.name || '')) || null;
}

function speak(pack: PhrasePack, text: string, slow: boolean, on: Listener) {
  if (!canSpeak()) return on('failed');
  const synth = window.speechSynthesis;
  const fire = () => {
    let started = false;
    const u = new SpeechSynthesisUtterance(text); utter = u;
    u.lang = pack.speechLang; u.rate = slow ? 0.5 : 0.9;
    const v = pickVoice(pack.speechLang); if (v) u.voice = v;
    u.onstart = () => { started = true; if (current === on) on('playing'); };
    u.onend = () => { if (current === on) on('idle'); };
    u.onerror = e => { if (current !== on) return; on(!started && !/interrupted|cancel/i.test(e.error || '') ? 'failed' : 'idle'); };
    try { synth.resume(); } catch { /* ignore */ }
    try { synth.speak(u); } catch { return on('failed'); }
    clearTimeout(speakTimer);
    speakTimer = window.setTimeout(() => { if (!started && !synth.speaking && current === on) on('failed'); }, 2500);
  };
  /* Safari throws away speech queued in the same breath as cancel(), so wait a beat after cancelling */
  if (synth.speaking || synth.pending) { try { synth.cancel(); } catch { /* ignore */ } setTimeout(fire, 150); }
  else fire();
  void utter;
}

export const translateLink = (text: string, from: string, to: string) =>
  `https://translate.google.com/?sl=${from}&tl=${to}&text=${encodeURIComponent(text)}&op=translate`;
