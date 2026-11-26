-- Приоритет желания: 5 уровней вместо 3 (1→1, 2→3, 3→5), по умолчанию 3
UPDATE "Item" SET "priority" = CASE "priority" WHEN 1 THEN 1 WHEN 2 THEN 3 WHEN 3 THEN 5 ELSE 3 END;
ALTER TABLE "Item" ALTER COLUMN "priority" SET DEFAULT 3;
