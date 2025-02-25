/*
  Warnings:

  - You are about to drop the column `expires_at` on the `Session` table. All the data in the column will be lost.
  - Added the required column `active_expires` to the `Session` table without a default value. This is not possible if the table is not empty.
  - Added the required column `idle_expires` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "active_expires" BIGINT NOT NULL,
    "idle_expires" BIGINT NOT NULL,
    "two_factor_verified" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Session" ("id", "two_factor_verified", "user_id") SELECT "id", "two_factor_verified", "user_id" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
CREATE INDEX "Session_user_id_idx" ON "Session"("user_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
