-- nickname → username (без потери данных)
ALTER TABLE "User" RENAME COLUMN "nickname" TO "username";
ALTER TABLE "User" RENAME COLUMN "nicknameChangedAt" TO "usernameChangedAt";
ALTER INDEX "User_nickname_key" RENAME TO "User_username_key";
ALTER TABLE "PasswordResetRequest" RENAME COLUMN "nickname" TO "username";
