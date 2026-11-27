import { defineConfig, loadEnv } from 'vite';

const env = loadEnv('test', '..', '');
// Тесты работают с отдельной базой, чтобы не трогать данные разработки.
const testDb =
  env.TEST_DATABASE_URL ?? (env.DATABASE_URL ?? '').replace(/\/([^/?]+)(\?|$)/, '/$1_test$2');

// globalSetup (миграции) запускается в этом же процессе
process.env.DATABASE_URL = testDb;

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testDb,
      CLIENT_URL: env.CLIENT_URL ?? 'http://localhost:5173',
      SESSION_SECRET: env.SESSION_SECRET ?? 'x'.repeat(32),
    },
    globalSetup: ['./tests/global-setup.ts'],
    fileParallelism: false,
  },
});
