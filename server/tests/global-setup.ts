import { execSync } from 'node:child_process';

/** Применяет миграции к тестовой базе (prisma создаёт её, если нет). */
export default function setup() {
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
}
