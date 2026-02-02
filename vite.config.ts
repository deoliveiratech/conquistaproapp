import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(),
  VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.svg', 'robots.txt', 'apple-touch-icon.png'],
    manifest: {
      name: 'MetasPro',
      short_name: 'MetasPro',
      description: 'App de metas, fases e tarefas',
      theme_color: '#d6f5d6',
      background_color: '#d6f5d6',
      display: 'standalone',
      orientation: 'portrait',
      icons: [
        {
          src: 'pwa-icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: 'pwa-icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        },
      ],
    },
    devOptions: {
      enabled: true,
      type: 'module',
    },
  }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
  }
});
