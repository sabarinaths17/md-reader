import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// mode === 'android'  →  base '/'   (Capacitor needs absolute paths)
// mode === 'development' / default  →  base './'  (Electron loads from file://)
export default defineConfig(({ mode }) => {
  const android = mode === 'android'
  return {
    plugins: [react()],
    base: android ? '/' : './',
    build: {
      rollupOptions: {
        // Capacitor packages are only installed when building for Android.
        // Mark them external so Rollup doesn't try to bundle them in the
        // Electron build (the code paths that use them are never reached there).
        external: android ? [] : [
          '@capacitor/core',
          '@capacitor/filesystem',
          '@capawesome/capacitor-file-picker',
        ],
      },
    },
  }
})
