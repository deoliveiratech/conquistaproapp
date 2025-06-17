import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,  // Habilita o PWA em modo de desenvolvimento
      },
      manifest: {
        name: 'ConquistaProApp',
        short_name: 'ConquistaProApp',
        description: 'Aplicação de gerenciamento de objetivos e tarefas',
        theme_color: '#D6F5D6',
        background_color: '#D6F5D6',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
    open: true, // Abre o navegador automaticamente
  }
});
