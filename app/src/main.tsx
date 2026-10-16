import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/instrument-sans/400.css'
import '@fontsource/instrument-sans/500.css'
import '@fontsource/instrument-sans/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import '@fontsource/zen-kaku-gothic-new/500.css'
import '@fontsource/zen-kaku-gothic-new/700.css'
import '@fontsource/zen-kaku-gothic-new/900.css'
import './index.css'
import { restoreBackup, startNative } from './native'
import { applyTheme } from './ui/theme'

applyTheme()

/* In the iPhone app, put back anything iOS cleared from storage before the app reads it.
   The rest loads afterwards, because the trip store and the sign-in read storage as they load. */
await restoreBackup()
const [{ default: App }, { pullAll, startSync }] = await Promise.all([import('./App.tsx'), import('./sync/engine')])

startSync()
void startNative(() => { void pullAll() })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
