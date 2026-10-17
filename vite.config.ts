import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// Allow the Tailscale hostname (tailscale serve proxies to localhost).
const allowedHosts = ['.ts.net']

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { allowedHosts },
  preview: { allowedHosts },
  test: { include: ['src/**/*.test.ts'] },
})
