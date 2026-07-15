/** Runtime config kept in plain ESM so Vite can start from a OneDrive workspace. */
export default {
  server: {
    host: '127.0.0.1',
    port: 3000,
    proxy: {
      '/api': { target: 'http://127.0.0.1:4000', changeOrigin: true },
      '/ws': { target: 'ws://127.0.0.1:4000', ws: true },
    },
  },
};
