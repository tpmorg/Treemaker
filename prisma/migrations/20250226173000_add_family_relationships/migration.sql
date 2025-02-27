-- CreateTable
CREATE TABLE "FamilyRelation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parentId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "treeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FamilyRelation_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FamilyRelation_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FamilyRelation_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "Tree" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromPersonId" TEXT NOT NULL,
    "toPersonId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subtype" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "treeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Relationship_fromPersonId_fkey" FOREIGN KEY ("fromPersonId") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Relationship_toPersonId_fkey" FOREIGN KEY ("toPersonId") REFERENCES "Person" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Relationship_treeId_fkey" FOREIGN KEY ("treeId") REFERENCES "Tree" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- AlterTable
ALTER TABLE "Node" DROP COLUMN "type";
ALTER TABLE "Node" DROP COLUMN "relatedTo";
ALTER TABLE "Node" DROP COLUMN "relatedBy";
ALTER TABLE "Node" DROP COLUMN "position";
ALTER TABLE "Node" ADD COLUMN "x" REAL;
ALTER TABLE "Node" ADD COLUMN "y" REAL;

-- CreateIndex
CREATE UNIQUE INDEX "FamilyRelation_parentId_childId_relationType_key" ON "FamilyRelation"("parentId", "childId", "relationType");

-- CreateIndex
CREATE UNIQUE INDEX "Relationship_fromPersonId_toPersonId_type_subtype_key" ON "Relationship"("fromPersonId", "toPersonId", "type", "subtype");