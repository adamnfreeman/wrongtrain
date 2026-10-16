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
