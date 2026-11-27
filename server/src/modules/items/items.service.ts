import type { ItemInput, UpdateItemInput } from '@wishlist/shared';
import { MAX_ITEM_IMAGES } from '@wishlist/shared';
import { prisma } from '../../core/db/prisma';
import { HttpError, notFound } from '../../core/http/errors';
import { deleteFile, saveImage } from '../files/files.service';
import { toItemDto } from '../wishlists/wishlists.dto';
import { ITEM_INCLUDE } from '../wishlists/wishlists.service';

const IMAGE_SIZE = 1200;

/** Товар владельца. Чужой или несуществующий — одинаковый 404. */
async function getOwnedItem(userId: string, itemId: string) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: { ...ITEM_INCLUDE, wishlist: { select: { ownerId: true } } },
  });
  if (!item || item.wishlist.ownerId !== userId) throw notFound('Товар не найден');
  return item;
}

async function getOwnedWishlist(userId: string, id: string) {
  const w = await prisma.wishlist.findUnique({ where: { id }, select: { ownerId: true } });
  if (!w || w.ownerId !== userId) throw notFound('Вишлист не найден');
}

const reload = async (itemId: string) =>
  toItemDto(await prisma.item.findUniqueOrThrow({ where: { id: itemId }, include: ITEM_INCLUDE }));

export async function createItem(userId: string, wishlistId: string, input: ItemInput) {
  await getOwnedWishlist(userId, wishlistId);
  const last = await prisma.item.aggregate({ where: { wishlistId }, _max: { position: true } });
  const { links, ...rest } = input;
  const item = await prisma.item.create({
    data: {
      ...rest,
      description: rest.description || null,
      note: rest.note || null,
      price: rest.price ?? null,
      wishlistId,
      position: (last._max.position ?? -1) + 1,
      links: { create: (links ?? []).map((l) => ({ url: l.url, label: l.label || null })) },
    },
    include: ITEM_INCLUDE,
  });
  return toItemDto(item);
}

export async function updateItem(userId: string, itemId: string, input: UpdateItemInput) {
  await getOwnedItem(userId, itemId);
  const { links, ...rest } = input;
  await prisma.$transaction(async (tx) => {
    await tx.item.update({
      where: { id: itemId },
      data: {
        ...rest,
        description: rest.description === undefined ? undefined : rest.description || null,
        note: rest.note === undefined ? undefined : rest.note || null,
      },
    });
    if (links) {
      await tx.itemLink.deleteMany({ where: { itemId } });
      await tx.itemLink.createMany({
        data: links.map((l) => ({ itemId, url: l.url, label: l.label || null })),
      });
    }
  });
  return reload(itemId);
}

export async function deleteItem(userId: string, itemId: string) {
  const item = await getOwnedItem(userId, itemId);
  await prisma.item.delete({ where: { id: itemId } });
  await Promise.all(item.images.map((i) => deleteFile(i.fileKey)));
}

export async function addImage(userId: string, itemId: string, file: Express.Multer.File | undefined) {
  const item = await getOwnedItem(userId, itemId);
  if (!file) throw new HttpError(400, 'FILE_REQUIRED', 'Выберите файл', { file: 'Выберите файл' });
  if (item.images.length >= MAX_ITEM_IMAGES) {
    throw new HttpError(400, 'TOO_MANY_IMAGES', `Не больше ${MAX_ITEM_IMAGES} фото`);
  }
  const fileKey = await saveImage(file.buffer, { size: IMAGE_SIZE });
  const position = item.images.reduce((m, i) => Math.max(m, i.position + 1), 0);
  await prisma.itemImage.create({
    data: { itemId, fileKey, position, isMain: item.images.length === 0 },
  });
  return reload(itemId);
}

export async function deleteImage(userId: string, itemId: string, imageId: string) {
  const item = await getOwnedItem(userId, itemId);
  const image = item.images.find((i) => i.id === imageId);
  if (!image) throw notFound('Фото не найдено');
  await prisma.$transaction(async (tx) => {
    await tx.itemImage.delete({ where: { id: imageId } });
    if (image.isMain) {
      const next = item.images.find((i) => i.id !== imageId);
      if (next) await tx.itemImage.update({ where: { id: next.id }, data: { isMain: true } });
    }
  });
  await deleteFile(image.fileKey);
  return reload(itemId);
}

export async function setMainImage(userId: string, itemId: string, imageId: string) {
  const item = await getOwnedItem(userId, itemId);
  if (!item.images.some((i) => i.id === imageId)) throw notFound('Фото не найдено');
  await prisma.$transaction([
    prisma.itemImage.updateMany({ where: { itemId }, data: { isMain: false } }),
    prisma.itemImage.update({ where: { id: imageId }, data: { isMain: true } }),
  ]);
  return reload(itemId);
}
