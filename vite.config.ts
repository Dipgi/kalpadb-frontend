import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

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
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
