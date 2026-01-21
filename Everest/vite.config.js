import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Ilova yangilanishi chiqsa, avtomatik yangilanadi
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'], // Qo'shimcha ikonka formatlari
      manifest: {
        name: 'Umarov.A - English Flashcards', // Ilovaning to'liq nomi
        short_name: 'Umarov.A', // Ekranda ko'rinadigan qisqa nom
        description: "Ingliz-O'zbek tilini o'rganish uchun mukammal web-ilova. So'z yodlash, o'yinlar va Smart Learning.",
        theme_color: '#020617', // Bizning asosiy fon rangimiz (bg-slate-950)
        background_color: '#020617', // Yuklanish paytidagi fon rangi
        display: 'standalone', // Brauzer panellarisiz to'liq ekran rejimi
        orientation: 'portrait', // Asosan vertikal rejimda ochiladi
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png', // Bu rasmlar /public papkasida bo'lishi kerak
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Android ikonkalari uchun moslashuvchan rejim
          }
        ]
      },
      // Offline ishlash uchun kesh sozlamalari
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'], // Barcha statik fayllarni keshga oladi
        runtimeCaching: [
          {
            // API so'rovlarini kesh qilish (Offline ma'lumotlar uchun)
            urlPattern: /^https:\/\/6970faf178fec16a63ffae81\.mockapi\.io\/.*/i,
            handler: 'NetworkFirst', // Avval internetni tekshiradi, yo'q bo'lsa keshdan oladi
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 kun saqlash
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ]
});