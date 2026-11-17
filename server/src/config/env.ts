import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  SERVER_PORT: z.coerce.number().int().default(3000),
  CLIENT_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  UPLOADS_DIR: z.string().default('./uploads'),
  SUPPORT_CONTACT_URL: z.string().optional(),
  ADMIN_NICKNAME: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Некорректные переменные окружения:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
