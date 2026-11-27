import { prisma } from '../core/db/prisma';
import { storage } from '../modules/files/storage';

/** Удаляет файлы, на которые не ссылается ни аватар, ни фото товара. `--dry-run` только показывает список. */
const dryRun = process.argv.includes('--dry-run');

const [avatars, images, stored] = await Promise.all([
  prisma.user.findMany({ where: { avatarKey: { not: null } }, select: { avatarKey: true } }),
  prisma.itemImage.findMany({ select: { fileKey: true } }),
  storage.list(),
]);
const used = new Set<string>([
  ...avatars.map((a) => a.avatarKey!),
  ...images.map((i) => i.fileKey),
]);
const orphans = stored.filter((key) => !used.has(key));

for (const key of orphans) {
  if (!dryRun) await storage.remove(key);
  console.log(`${dryRun ? 'нашёл' : 'удалил'}: ${key}`);
}
console.log(`Файлов в хранилище: ${stored.length}, лишних: ${orphans.length}${dryRun ? ' (ничего не удалено)' : ''}`);
await prisma.$disconnect();
