import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';

/** NestJS route prefixes — keep in sync with AppConstants.ApiUrls */
const API_ROUTE_PREFIXES = [
  'auth',
  'users',
  'products',
  'categories',
  'customers',
  'suppliers',
  'stocks',
  'purchases',
  'purchase-items',
  'sales',
  'sale-items',
  'cart',
  'cart-items',
  'orders',
  'order-items',
  'payments',
].join('|');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_PROXY_TARGET?.trim() || 'http://localhost:3000';

  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
    server: {
      port: 5173,
      strictPort: false,
      proxy: {
        [`^/(${API_ROUTE_PREFIXES})`]: {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  };
});
