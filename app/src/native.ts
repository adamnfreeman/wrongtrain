/* What changes when WrongTrain runs as the iPhone app rather than in a browser. */
import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();

/** Where invite links point. Inside the app the page's own address is capacitor://localhost, which nobody else can open. */
export const WEB_URL = 'https://wrongtrain.lol/app/';
export const shareBase = () => (isNative ? WEB_URL : location.origin + location.pathname);

/* Trips live in the web view's localStorage, which iOS may clear when the phone runs low on space.
   In the app, every save is also written to the app's own storage (UserDefaults), and copied back
   at start-up if localStorage has lost it. */
const BACKUP_KEYS = ['wrongtrain', 'wt-auth'];

export async function restoreBackup() {
  if (!isNative) return;
  const { Preferences } = await import('@capacitor/preferences');
  for (const key of BACKUP_KEYS) {
    try {
      if (localStorage.getItem(key) != null) continue;
      const { value } = await Preferences.get({ key });
      if (value != null) localStorage.setItem(key, value);
    } catch { /* nothing to restore */ }
  }
}

let pending = 0;
/** Copies the saved data to the app's own storage, a moment after the last change. */
export function backupSoon() {
  if (!isNative) return;
  clearTimeout(pending);
  pending = window.setTimeout(async () => {
    const { Preferences } = await import('@capacitor/preferences');
    for (const key of BACKUP_KEYS) {
      const value = localStorage.getItem(key);
      try { if (value != null) await Preferences.set({ key, value }); else await Preferences.remove({ key }); } catch { /* try again next save */ }
    }
  }, 500);
}

/** Native set-up: status bar text that follows light and dark mode, and the launch screen hidden once the app has drawn. */
export async function startNative(onResume: () => void) {
  if (!isNative) return;
  const [{ StatusBar, Style }, { SplashScreen }, { App }] = await Promise.all([
    import('@capacitor/status-bar'), import('@capacitor/splash-screen'), import('@capacitor/app'),
  ]);
  try { await StatusBar.setStyle({ style: Style.Default }); } catch { /* not available */ }
  /* The plugin ignores hide() until its own launch fade-in has finished, and still reports success,
     so a call this early can be dropped and leave the launch screen up for good. Ask again a few
     times; once it is gone, further calls do nothing. */
  const hide = () => { void SplashScreen.hide({ fadeOutDuration: 200 }); };
  requestAnimationFrame(hide);
  for (const ms of [300, 1000, 2500]) setTimeout(hide, ms);
  /* coming back to the app: catch up shared trips (the web page does this on visibilitychange) */
  void App.addListener('resume', onResume);
  /* going to the background: make sure the backup is current */
  void App.addListener('pause', backupSoon);
}
