import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env';

/** Хранилище файлов. Сегодня — папка на диске, позже можно заменить на S3, не трогая остальной код. */
export interface Storage {
  put(key: string, data: Buffer): Promise<void>;
  read(key: string): Promise<Buffer | null>;
  remove(key: string): Promise<void>;
  /** Все ключи в хранилище (для чистки неиспользуемых файлов). */
  list(): Promise<string[]>;
}

class LocalStorage implements Storage {
  constructor(private dir: string) {}

  private resolve(key: string) {
    const full = path.resolve(this.dir, key);
    // Ключ приходит из базы или из проверенного URL, но путь за пределы папки не выпускаем в любом случае
    if (!full.startsWith(path.resolve(this.dir) + path.sep)) throw new Error('Некорректный ключ');
    return full;
  }

  async put(key: string, data: Buffer) {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
  }

  async read(key: string) {
    try {
      return await readFile(this.resolve(key));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return null;
      throw e;
    }
  }

  async remove(key: string) {
    await rm(this.resolve(key), { force: true });
  }

  async list() {
    try {
      return await readdir(this.dir);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw e;
    }
  }
}

export const storage: Storage = new LocalStorage(env.UPLOADS_DIR);
