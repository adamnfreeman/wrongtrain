/* Push notifications, for what starts on someone else's phone and should reach you with the app
   closed: a to-do reminder, someone starting to share where they are. The iPhone app asks for
   permission and saves its push address (push_tokens, schema.sql) for whoever is signed in; the
   send-push function sends through Apple. Passport reminders don't need this: they're scheduled on
   the phone itself (sync/reminders.ts). Browsers: none. */
import { Capacitor } from '@capacitor/core';
import { supabase } from './engine';

let started = false;

/** Asks once for permission and registers this phone; tapping a notification opens its page. */
export async function startPush(open: (tab: string) => void) {
  if (started || !Capacitor.isNativePlatform()) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  started = true;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    await PushNotifications.addListener('registration', t => { void supabase.rpc('save_push_token', { token: t.value, platform: 'ios' }); });
    await PushNotifications.addListener('pushNotificationActionPerformed', a => {
      const tab = (a.notification.data as { tab?: string } | undefined)?.tab;
      if (tab) open(tab);
    });
    let p = await PushNotifications.checkPermissions();
    if (p.receive === 'prompt' || p.receive === 'prompt-with-rationale') p = await PushNotifications.requestPermissions();
    if (p.receive === 'granted') await PushNotifications.register();
  } catch { started = false; }
}

/** Asks the server to tell the others: a reminder about a to-do, or that you started sharing where
    you are. Quiet when it fails: the in-app banner still reaches them next time they open the app. */
export function sendPush(tripId: string, what: { kind: 'remind'; todo_id: string } | { kind: 'sharing' }) {
  void supabase.functions.invoke('send-push', { body: { trip_id: tripId, ...what } }).catch(() => {});
}
