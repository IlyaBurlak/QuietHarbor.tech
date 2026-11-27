-- Имя и фамилия отдельно; fullName остаётся «Имя Фамилия»
ALTER TABLE "User" ADD COLUMN "firstName" TEXT NOT NULL DEFAULT '', ADD COLUMN "lastName" TEXT NOT NULL DEFAULT '';
UPDATE "User" SET
  "firstName" = split_part("fullName", ' ', 1),
  "lastName" = COALESCE(NULLIF(substr("fullName", length(split_part("fullName", ' ', 1)) + 2), ''), '');
ALTER TABLE "User" ALTER COLUMN "firstName" DROP DEFAULT, ALTER COLUMN "lastName" DROP DEFAULT;

-- Токен сброса пароля уникален (в базе только хэш)
CREATE UNIQUE INDEX "PasswordResetRequest_tokenHash_key" ON "PasswordResetRequest"("tokenHash");
