// vite.config.js
export default {
  root: 'frontend',
  server: {
    port: 5173,                 // change to 5174 if 5173 is busy
    proxy: {
      '/.netlify/functions': {
        target: 'http://localhost:8888',
        changeOrigin: true,
      },
    },
  },
  preview: { port: 5173 },
  build: { outDir: '../dist', emptyOutDir: true },
}
