-- Направление сортировки: по приоритету раньше шло от большего, по цене — от меньшего
CREATE TYPE "SortDir" AS ENUM ('asc', 'desc');
ALTER TABLE "Wishlist" ADD COLUMN "sortDir" "SortDir" NOT NULL DEFAULT 'desc';
UPDATE "Wishlist" SET "sortDir" = 'asc' WHERE "sortMode" = 'price';
