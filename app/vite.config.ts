import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'

/* Which build is this? Shown on Account & settings, so you can tell whether a phone has the latest.
   The number counts the saved changes on this branch; the time tells apart builds made between them. */
const git = (cmd: string) => { try { return execSync(`git ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { return '' } }
const BUILD = { n: git('rev-list --count HEAD'), commit: git('rev-parse --short HEAD'), at: new Date().toISOString() }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  /* relative paths, so one build works at wrongtrain.lol/app/ and inside the iOS app */
  base: './',
  define: { __BUILD__: JSON.stringify(BUILD) },
})
