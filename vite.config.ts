import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import browserslist from 'browserslist'
import { browserslistToTargets } from 'lightningcss'

function buildId(): string {
  // On Cloudflare Pages the commit SHA is provided as an env var; fall back to local git.
  let sha = process.env.CF_PAGES_COMMIT_SHA?.slice(0, 7)
  if (!sha) {
    try {
      sha = execSync('git rev-parse --short HEAD').toString().trim()
    } catch {
      sha = 'dev'
    }
  }
  const date = new Date().toISOString().slice(0, 10)
  return `${date}·${sha}`
}

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(buildId()),
  },
  plugins: [react(), tailwindcss()],
  css: {
    // Tailwind v4 emits its palette as oklch(), which needs Chrome 111+.
    // Lightning CSS compiles it down (rgb fallbacks) so older browsers —
    // e.g. Chrome 109, the last version on Windows 7 — still get colors.
    transformer: 'lightningcss',
    lightningcss: {
      targets: browserslistToTargets(
        browserslist('chrome >= 87, edge >= 88, firefox >= 78, safari >= 14'),
      ),
    },
  },
  build: {
    cssMinify: 'lightningcss',
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
