import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { HttpError } from '../../core/http/errors';
import { logger } from '../../core/http/logger';
import { storage } from './storage';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);
/** Защита от «бомб распаковки»: картинка с огромным числом пикселей при малом размере файла. */
const MAX_INPUT_PIXELS = 40_000_000;

export const FILE_KEY_PATTERN = /^[a-f0-9]{32}\.webp$/;

/** Не больше двух обработок картинок одновременно: sharp ест память, а сервер небольшой. */
const MAX_PARALLEL_IMAGES = 2;
let running = 0;
const waiting: (() => void)[] = [];
async function withImageSlot<T>(task: () => Promise<T>): Promise<T> {
  if (running >= MAX_PARALLEL_IMAGES) await new Promise<void>((resolve) => waiting.push(resolve));
  running++;
  try {
    return await task();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

const invalidImage = () =>
  new HttpError(400, 'INVALID_IMAGE', 'Подходят только изображения JPG, PNG и WebP');

/**
 * Проверяет, что в буфере настоящая картинка (по содержимому, а не по расширению или заголовку),
 * и пересобирает её: убирает EXIF (там может быть геолокация), поворачивает по ориентации,
 * сжимает и сохраняет под случайным именем. Возвращает ключ файла.
 */
export async function saveImage(
  data: Buffer,
  options: { size: number; square?: boolean },
): Promise<string> {
  let output: Buffer;
  try {
    output = await withImageSlot(async () => {
    const image = sharp(data, { limitInputPixels: MAX_INPUT_PIXELS });
    const meta = await image.metadata();
    if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) throw invalidImage();
    return image
      .rotate()
      .resize(options.size, options.square ? options.size : undefined, {
        fit: options.square ? 'cover' : 'inside',
        withoutEnlargement: !options.square,
      })
      .webp({ quality: 82 })
      .toBuffer();
    });
  } catch (e) {
    if (e instanceof HttpError) throw e;
    throw invalidImage();
  }
  const key = `${randomBytes(16).toString('hex')}.webp`;
  await storage.put(key, output);
  return key;
}

/** Удаление не должно ломать основное действие: ошибку пишем в лог. */
export async function deleteFile(key: string | null | undefined) {
  if (!key) return;
  try {
    await storage.remove(key);
  } catch (e) {
    logger.error({ err: e, key }, 'Не удалось удалить файл');
  }
}
