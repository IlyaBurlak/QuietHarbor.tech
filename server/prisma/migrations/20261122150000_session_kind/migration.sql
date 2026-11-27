-- Админские сессии отделены от обычных: свой тип и короткий срок
CREATE TYPE "SessionKind" AS ENUM ('user', 'admin');
ALTER TABLE "Session" ADD COLUMN "kind" "SessionKind" NOT NULL DEFAULT 'user';
