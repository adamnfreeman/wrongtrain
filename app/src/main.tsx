import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/sora/400.css'
import '@fontsource/sora/600.css'
import '@fontsource/sora/700.css'
import '@fontsource/manrope/400.css'
import '@fontsource/manrope/500.css'
import '@fontsource/manrope/600.css'
import '@fontsource/manrope/700.css'
import '@fontsource/zen-kaku-gothic-new/500.css'
import '@fontsource/zen-kaku-gothic-new/700.css'
import '@fontsource/zen-kaku-gothic-new/900.css'
import './index.css'
import { restoreBackup, startNative } from './native'
import { applyTheme } from './ui/theme'
import { JAPAN } from './edition'

applyTheme()

/* In the iPhone app, put back anything iOS cleared from storage before the app reads it.
   The rest loads afterwards, because the trip store and the sign-in read storage as they load. */
await restoreBackup()
const [{ default: App }, { pullAll, startSync }] = await Promise.all([import('./App.tsx'), import('./sync/engine')])

/* The Japan edition reads its one trip from the Google Sheet, not from shared trips; it keeps
   working with no signal through its own service worker (public/japan-sw.js). */
if (JAPAN) {
  const { seedFromOldPage } = await import('./ui/japan')
  seedFromOldPage()
  if ('serviceWorker' in navigator) void navigator.serviceWorker.register('./japan-sw.js').catch(() => {})
} else {
  startSync()
  void startNative(() => { void pullAll() })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
