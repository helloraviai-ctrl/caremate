// vite.config.js
export default {
  root: 'frontend',
  server: { port: 5173 },
  preview: { port: 5173 },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
}
