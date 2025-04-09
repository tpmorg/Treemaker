import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, beforeEach } from 'vitest';

// Create a separate test client with a unique database URL for tests
const prisma = new PrismaClient({
  datasourceUrl: 'file:./test.db'
});

// Setup hooks
beforeAll(async () => {
  // For a real implementation, we would run Prisma migrations
  // For this example, we'll create a simplified schema for testing
  
  // Create User table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS User (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      username TEXT NOT NULL,
      email_verified INTEGER NOT NULL DEFAULT 0,
      totp_key BLOB,
      recovery_code BLOB NOT NULL
    )
  `);
  
  // Create Tree table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS Tree (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL,
      ownerId TEXT NOT NULL,
      FOREIGN KEY (ownerId) REFERENCES User(id)
    )
  `);
  
  // Create Person table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS Person (
      id TEXT PRIMARY KEY,
      firstName TEXT NOT NULL,
      lastName TEXT,
      birthDate DATETIME,
      deathDate DATETIME,
      gender TEXT,
      notes TEXT,
      treeId TEXT NOT NULL,
      userId TEXT UNIQUE,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL,
      FOREIGN KEY (treeId) REFERENCES Tree(id),
      FOREIGN KEY (userId) REFERENCES User(id)
    )
  `);
  
  // Create FamilyRelation table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS FamilyRelation (
      id TEXT PRIMARY KEY,
      parentId TEXT NOT NULL,
      childId TEXT NOT NULL,
      relationType TEXT NOT NULL,
      treeId TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL,
      FOREIGN KEY (parentId) REFERENCES Person(id),
      FOREIGN KEY (childId) REFERENCES Person(id),
      FOREIGN KEY (treeId) REFERENCES Tree(id),
      UNIQUE(parentId, childId, relationType)
    )
  `);
  
  // Create Relationship table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS Relationship (
      id TEXT PRIMARY KEY,
      fromPersonId TEXT NOT NULL,
      toPersonId TEXT NOT NULL,
      type TEXT NOT NULL,
      subtype TEXT,
      startDate DATETIME,
      endDate DATETIME,
      treeId TEXT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL,
      FOREIGN KEY (fromPersonId) REFERENCES Person(id),
      FOREIGN KEY (toPersonId) REFERENCES Person(id),
      FOREIGN KEY (treeId) REFERENCES Tree(id),
      UNIQUE(fromPersonId, toPersonId, type, subtype)
    )
  `);
  
  // Create Node table
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS Node (
      id TEXT PRIMARY KEY,
      personId TEXT NOT NULL,
      treeId TEXT NOT NULL,
      x REAL,
      y REAL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL,
      FOREIGN KEY (personId) REFERENCES Person(id),
      FOREIGN KEY (treeId) REFERENCES Tree(id)
    )
  `);
});

beforeEach(async () => {
  // Clear data before each test
  try {
    // Turn off foreign key constraints temporarily
    await prisma.$executeRaw`PRAGMA foreign_keys = OFF;`;
    
    // Clear all tables
    await prisma.$executeRaw`DELETE FROM Relationship;`;
    await prisma.$executeRaw`DELETE FROM FamilyRelation;`;
    await prisma.$executeRaw`DELETE FROM Node;`;
    await prisma.$executeRaw`DELETE FROM Person;`;
    await prisma.$executeRaw`DELETE FROM Tree;`;
    await prisma.$executeRaw`DELETE FROM User;`;
    
    // Turn foreign key constraints back on
    await prisma.$executeRaw`PRAGMA foreign_keys = ON;`;
    
    // Seed with test data
    await seedTestData();
  } catch (error) {
    console.error('Error in beforeEach:', error);
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Seed function to create test data
async function seedTestData() {
  try {
    // Create test user
    await prisma.$executeRaw`
      INSERT INTO User (id, email, username, email_verified, recovery_code)
      VALUES ('test-user-id', 'test@example.com', 'testuser', 1, X'74657374')
    `;
    
    // Create test tree
    await prisma.$executeRaw`
      INSERT INTO Tree (id, name, ownerId, createdAt, updatedAt)
      VALUES ('test-tree-id', 'Test Family Tree', 'test-user-id', datetime('now'), datetime('now'))
    `;
    
    // Create test people
    await prisma.$executeRaw`
      INSERT INTO Person (id, firstName, lastName, treeId, createdAt, updatedAt)
      VALUES ('test-person-1', 'John', 'Doe', 'test-tree-id', datetime('now'), datetime('now'))
    `;
    
    await prisma.$executeRaw`
      INSERT INTO Person (id, firstName, lastName, treeId, createdAt, updatedAt)
      VALUES ('test-person-2', 'Jane', 'Doe', 'test-tree-id', datetime('now'), datetime('now'))
    `;
    
    return { 
      user: { id: 'test-user-id', email: 'test@example.com', username: 'testuser' },
      tree: { id: 'test-tree-id', name: 'Test Family Tree', ownerId: 'test-user-id' },
      person1: { id: 'test-person-1', firstName: 'John', lastName: 'Doe', treeId: 'test-tree-id' },
      person2: { id: 'test-person-2', firstName: 'Jane', lastName: 'Doe', treeId: 'test-tree-id' }
    };
  } catch (error) {
    console.error('Error in seedTestData:', error);
    throw error;
  }
}

// Export for use in tests
export { prisma, seedTestData };
