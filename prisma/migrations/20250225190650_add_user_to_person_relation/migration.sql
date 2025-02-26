-- SQLite doesn't support adding foreign key constraints to existing tables
-- We'll add the column and a unique constraint
-- AlterTable
ALTER TABLE "Person" ADD COLUMN "userId" TEXT;

-- Add unique constraint to Person.userId
CREATE UNIQUE INDEX "Person_userId_key" ON "Person"("userId");