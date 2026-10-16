import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  /* relative paths, so one build works at wrongtrain.lol/app/ and inside the iOS app */
  base: './',
})
