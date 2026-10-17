import react from '@vitejs/plugin-react'
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'
import { defineConfig } from 'vite'

/* Which build is this? Shown on Account & settings, so you can tell whether a phone has the latest.
   The number counts the saved changes on this branch; the time tells apart builds made between them. */
const git = (cmd: string) => { try { return execSync(`git ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() } catch { return '' } }
const BUILD = { n: git('rev-list --count HEAD'), commit: git('rev-parse --short HEAD'), at: new Date().toISOString() }

/* The Japan page's own sheet reader (parseTrip in legacy/template.html), as a module, so the Japan
   edition reads the sheet exactly as the page does (sheet/live.ts). */
const parseTrip = (): Plugin => ({
  name: 'parse-trip',
  resolveId: id => (id === 'virtual:parse-trip' ? '\0parse-trip' : null),
  load(id) {
    if (id !== '\0parse-trip') return null
    const tpl = readFileSync(new URL('../legacy/template.html', import.meta.url), 'utf8')
    return tpl.slice(tpl.indexOf('function parseTrip'), tpl.indexOf('/*PARSER-END*/')) + '\nexport { parseTrip };'
  },
})

/* The files the Japan edition saves on the phone the first time it opens (public/japan-sw.js),
   so it works with no signal from then on: the code and the Latin fonts. The Japanese font comes
   in hundreds of small pieces and is saved piece by piece as it's used. */
const precacheList = (): Plugin => ({
  name: 'precache-list',
  apply: 'build',
  generateBundle(_, bundle) {
    const files = Object.keys(bundle).filter(f => /\.(js|css)$/.test(f) || (/\.woff2$/.test(f) && !/zen-kaku/.test(f)))
    this.emitFile({ type: 'asset', fileName: 'precache.json', source: JSON.stringify(files) })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), parseTrip(), precacheList()],
  /* relative paths, so one build works at wrongtrain.lol/app/ and inside the iOS app */
  base: './',
  define: { __BUILD__: JSON.stringify(BUILD) },
})
