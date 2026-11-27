import { Gift } from 'lucide-react';
import type { ItemImageDto } from '@wishlist/shared';
import { fileUrl } from '@/shared/lib';

/** Главное фото товара или заглушка, если фото нет. */
export function ItemCover({ images, alt }: { images: ItemImageDto[]; alt: string }) {
  const main = images.find((i) => i.isMain) ?? images[0];
  return (
    <div className="item-cover">
      {main ? (
        <img src={fileUrl(main.fileKey)} alt={alt} loading="lazy" />
      ) : (
        <span className="item-cover__stub" role="img" aria-label="Фото не добавлено">
          <Gift size={32} aria-hidden />
        </span>
      )}
    </div>
  );
}
