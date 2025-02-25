/*
  Warnings:

  - You are about to drop the column `active_expires` on the `Session` table. All the data in the column will be lost.
  - You are about to drop the column `idle_expires` on the `Session` table. All the data in the column will be lost.
  - Added the required column `expires_at` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Layout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "config" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "treeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Layout_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "Tree" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Layout" ("config", "createdAt", "id", "isDefault", "name", "treeId", "type", "updatedAt") SELECT "config", "createdAt", "id", "isDefault", "name", "treeId", "type", "updatedAt" FROM "Layout";
DROP TABLE "Layout";
ALTER TABLE "new_Layout" RENAME TO "Layout";
CREATE TABLE "new_Node" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "position" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Node_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Node_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "Tree" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Node" ("createdAt", "id", "personId", "position", "treeId", "type", "updatedAt") SELECT "createdAt", "id", "personId", "position", "treeId", "type", "updatedAt" FROM "Node";
DROP TABLE "Node";
ALTER TABLE "new_Node" RENAME TO "Node";
CREATE TABLE "new_Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "expires_at" DATETIME NOT NULL,
    "two_factor_verified" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Session_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Session" ("id", "two_factor_verified", "user_id") SELECT "id", "two_factor_verified", "user_id" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
CREATE INDEX "Session_user_id_idx" ON "Session"("user_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
