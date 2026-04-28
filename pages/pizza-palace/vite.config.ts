import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.tsx'),
      name: 'TapLabPage',
      fileName: 'page',
      formats: ['iife'],
    },
    rollupOptions: {
      output: {
        entryFileNames: 'page.[hash].js',
      },
    },
    cssCodeSplit: false,
    minify: 'terser',
    target: 'es2017',
  },
});
