import react from '@vitejs/plugin-react';
import { copyFileSync } from 'node:fs';
import { defineConfig } from 'vite';

// GRANA_BASE permite publicar numa subpasta (ex.: /grana/ no GitHub Pages).
const base = process.env.GRANA_BASE ?? '/';

export default defineConfig({
  base,
  plugins: [
    react(),
    {
      // GitHub Pages não conhece as rotas do app: o 404.html igual ao index faz o link direto funcionar.
      name: 'copiar-404',
      closeBundle() {
        try {
          copyFileSync('dist/index.html', 'dist/404.html');
        } catch {
          /* só existe no build */
        }
      },
    },
  ],
  server: { port: 5183 },
});
