-- Режим сортировки товаров вишлиста: вручную, по приоритету, по цене
CREATE TYPE "WishlistSort" AS ENUM ('manual', 'priority', 'price');
ALTER TABLE "Wishlist" ADD COLUMN "sortMode" "WishlistSort" NOT NULL DEFAULT 'manual';
