import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Для GitHub Pages: в CI задаётся GITHUB_PAGES_BASE=/имя-репозитория/
export default defineConfig({
  plugins: [vue()],
  base: process.env.GITHUB_PAGES_BASE || '/',
})
