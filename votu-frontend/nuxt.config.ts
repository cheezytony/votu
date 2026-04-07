// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite';

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  ssr: true,

  devServer: {
    port: 3001,
  },

  modules: ['@nuxt/eslint', '@nuxt/fonts', '@nuxt/hints', '@pinia/nuxt'],

  runtimeConfig: {
    public: {
      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? 'http://localhost:3000',
    },
  },

  css: ['~/assets/css/main.css'],

  typescript: {
    strict: true,
  },

  vite: {
    plugins: [tailwindcss()],
    server: {
      watch: {
        // Prevent Vite from watching node_modules — avoids EMFILE on macOS
        ignored: ['**/node_modules/**', '**/.git/**'],
      },
    },
  },
});
