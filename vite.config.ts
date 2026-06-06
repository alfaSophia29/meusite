
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente do arquivo .env baseado no modo (development/production)
  // O terceiro argumento '' garante que carregue todas as variáveis, não apenas as com prefixo VITE_
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.js',
        injectManifest: {
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        },
        devOptions: {
          enabled: false,
        },
        manifest: {
          name: 'FacePhone',
          short_name: 'FacePhone',
          description: 'Plataforma social de alta conexão com marketplace profissional, reels e ecossistema de monetização.',
          theme_color: '#0a0c10',
          background_color: '#0a0c10',
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
      })
    ],
    define: {
      // Polyfill para process.env para evitar erros de 'process is not defined'
      'process.env': env,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      emptyOutDir: true
    },
    server: {
      host: true,
      port: 3000,
      strictPort: true
    }
  };
});
