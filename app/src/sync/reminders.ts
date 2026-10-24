/* Puts the passport reminders (model/reminders.ts) on the iPhone as local notifications: scheduled
   on the phone itself, so they come with the app closed and with no signal. Done again whenever the
   trips change; this app's reminders use ids from 7000 so others are left alone. Browsers: none. */
import { Capacitor } from '@capacitor/core';
import type { Trip } from '../model/types';
import { passportReminders } from '../model/reminders';

const FIRST_ID = 7000, MAX = 40;
let last = '';

export async function scheduleReminders(trips: Trip[]) {
  if (!Capacitor.isNativePlatform()) return;
  const list = passportReminders(trips).slice(0, MAX);
  const sig = list.map(r => `${r.key}@${r.at.getTime()}`).join();
  if (sig === last) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const pending = await LocalNotifications.getPending();
    const ours = pending.notifications.filter(n => n.id >= FIRST_ID && n.id < FIRST_ID + 1000);
    if (ours.length) await LocalNotifications.cancel({ notifications: ours.map(n => ({ id: n.id })) });
    last = sig;
    if (!list.length) return;
    /* asked the first time there's a flight to remind about, not at first launch */
    let perm = await LocalNotifications.checkPermissions();
    if (perm.display === 'prompt' || perm.display === 'prompt-with-rationale') perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return;
    await LocalNotifications.schedule({
      notifications: list.map((r, i) => ({ id: FIRST_ID + i, title: r.title, body: r.body, schedule: { at: r.at, allowWhileIdle: true } })),
    });
  } catch { last = ''; /* tried again on the next change */ }
}
