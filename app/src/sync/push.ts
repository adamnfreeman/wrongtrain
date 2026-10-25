/* Push notifications, for what starts on someone else's phone and should reach you with the app
   closed: a to-do reminder, someone starting to share where they are. The iPhone app asks for
   permission and saves its push address (push_tokens, schema.sql) for whoever is signed in; the
   send-push function sends through Apple. Passport reminders don't need this: they're scheduled on
   the phone itself (sync/reminders.ts). Browsers: none. */
import { Capacitor } from '@capacitor/core';
import { supabase } from './engine';

let started = false, listening = false, token = '';
/* the open trip's page changer: a tap on a notification goes to the trip open now, not the first one */
let opener: (tab: string) => void = () => {};

/** Asks once for permission and registers this phone; tapping a notification opens its page. */
export async function startPush(open: (tab: string) => void) {
  opener = open;
  if (started || !Capacitor.isNativePlatform()) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return;
  started = true;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    /* added once: a retry or a new sign-in must not add them twice */
    if (!listening) {
      listening = true;
      /* awaited: the database client only sends a request once its answer is asked for */
      await PushNotifications.addListener('registration', async t => { token = t.value; await supabase.rpc('save_push_token', { token: t.value, platform: 'ios' }); });
      await PushNotifications.addListener('pushNotificationActionPerformed', a => {
        const tab = (a.notification.data as { tab?: string } | undefined)?.tab;
        if (tab) opener(tab);
      });
    }
    let p = await PushNotifications.checkPermissions();
    if (p.receive === 'prompt' || p.receive === 'prompt-with-rationale') p = await PushNotifications.requestPermissions();
    if (p.receive === 'granted') await PushNotifications.register();
  } catch { started = false; }
}

/** On signing out: this phone stops getting the account's notifications, and the next person to
    sign in registers it for themselves. */
export async function stopPush() {
  started = false;
  if (token) await supabase.rpc('drop_push_token', { token }).then(() => {}, () => {});
  token = '';
}

/** Asks the server to tell the others: a reminder about a to-do, or that you started sharing where
    you are. Quiet when it fails: the in-app banner still reaches them next time they open the app. */
export function sendPush(tripId: string, what: { kind: 'remind'; todo_id: string } | { kind: 'sharing' }) {
  void supabase.functions.invoke('send-push', { body: { trip_id: tripId, ...what } }).catch(() => {});
}
