-- Пара друзей уникальна без учёта порядка
CREATE UNIQUE INDEX "Friendship_pair_unique" ON "Friendship" (LEAST("requesterId", "addresseeId"), GREATEST("requesterId", "addresseeId"));
