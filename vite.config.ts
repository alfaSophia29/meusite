
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  // Carrega variáveis de ambiente do arquivo .env baseado no modo (development/production)
  // O terceiro argumento '' garante que carregue todas as variáveis, não apenas as com prefixo VITE_
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    define: {
      // Polyfill para process.env para evitar erros de 'process is not defined'
      'process.env': env,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      commonjsOptions: {
        transformMixedEsModules: true,
      },
    },
    server: {
      host: true,
      port: 3000,
      strictPort: true
    }
  };
});
