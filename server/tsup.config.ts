import { defineConfig } from 'tsup';

export default defineConfig({
  // Скрипты собираются рядом с сервером, чтобы запускать их в прод-контейнере без tsx
  entry: {
    index: 'src/index.ts',
    'scripts/create-admin': 'src/scripts/create-admin.ts',
    'scripts/create-reset-link': 'src/scripts/create-reset-link.ts',
  },
  format: ['esm'],
  noExternal: ['@wishlist/shared'],
});
