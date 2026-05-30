import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // GitHub Pages project sites are served under /{repo}/ — set VITE_BASE_PATH in CI.
  base: process.env.VITE_BASE_PATH ?? './',
  plugins: [
    tailwindcss(),
  ],
})
