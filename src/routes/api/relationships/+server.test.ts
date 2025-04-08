import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../../test/setup';

// Mock prisma client - must be at the top level
vi.mock('$lib/server/prismaservice', () => ({
  prisma
}));

import { POST, GET, DELETE } from './+server';
import { createRequestEvent, createJsonRequest } from '../../../test/utils';

describe('Relationships API', () => {
  describe('POST endpoint', () => {
    it('should create a sibling relationship', async () => {
      // Arrange
      const requestBody = {
        fromPersonId: 'test-person-1',
        toPersonId: 'test-person-2',
        type: 'SIBLING',
        treeId: 'test-tree-id'
      };
      
      const request = createJsonRequest('/api/relationships', requestBody);
      const event = createRequestEvent({ request });
      
      // Act
      const response = await POST(event);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.relationship).toBeDefined();
      expect(data.relationship.fromPersonId).toBe('test-person-1');
      expect(data.relationship.toPersonId).toBe('test-person-2');
      expect(data.relationship.type).toBe('SIBLING');
      
      // Verify database state
      const relationship = await prisma.relationship.findFirst({
        where: {
          fromPersonId: 'test-person-1',
          toPersonId: 'test-person-2',
          type: 'SIBLING'
        }
      });
      expect(relationship).not.toBeNull();
    });
    
    it('should create a spouse relationship', async () => {
      // Arrange
      const requestBody = {
        fromPersonId: 'test-person-1',
        toPersonId: 'test-person-2',
        type: 'SPOUSE',
        treeId: 'test-tree-id',
        startDate: '2020-01-01'
      };
      
      const request = createJsonRequest('/api/relationships', requestBody);
      const event = createRequestEvent({ request });
      
      // Act
      const response = await POST(event);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Verify database state
      const relationship = await prisma.relationship.findFirst({
        where: {
          fromPersonId: 'test-person-1',
          toPersonId: 'test-person-2',
          type: 'SPOUSE'
        }
      });
      expect(relationship).not.toBeNull();
      expect(relationship?.startDate).toBeDefined();
    });
    
    it('should return 400 if relationship already exists', async () => {
      // Arrange - Create relationship first
      await prisma.relationship.create({
        data: {
          fromPersonId: 'test-person-1',
          toPersonId: 'test-person-2',
          type: 'SIBLING',
          treeId: 'test-tree-id'
        }
      });
      
      const requestBody = {
        fromPersonId: 'test-person-1',
        toPersonId: 'test-person-2',
        type: 'SIBLING',
        treeId: 'test-tree-id'
      };
      
      const request = createJsonRequest('/api/relationships', requestBody);
      const event = createRequestEvent({ request });
      
      // Act
      const response = await POST(event);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('already exists');
    });
    
    it('should return 400 if required fields are missing', async () => {
      // Arrange - Missing type
      const requestBody = {
        fromPersonId: 'test-person-1',
        toPersonId: 'test-person-2',
        treeId: 'test-tree-id'
      };
      
      const request = createJsonRequest('/api/relationships', requestBody);
      const event = createRequestEvent({ request });
      
      // Act
      const response = await POST(event);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
    
    it('should return 400 if type is invalid', async () => {
      // Arrange - Invalid type
      const requestBody = {
        fromPersonId: 'test-person-1',
        toPersonId: 'test-person-2',
        type: 'INVALID_TYPE',
        treeId: 'test-tree-id'
      };
      
      const request = createJsonRequest('/api/relationships', requestBody);
      const event = createRequestEvent({ request });
      
      // Act
      const response = await POST(event);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
  
  describe('GET endpoint', () => {
    beforeEach(async () => {
      // Create test relationships
      await prisma.relationship.create({
        data: {
          fromPersonId: 'test-person-1',
          toPersonId: 'test-person-2',
          type: 'SIBLING',
          treeId: 'test-tree-id'
        }
      });
      
      await prisma.relationship.create({
        data: {
          fromPersonId: 'test-person-1',
          toPersonId: 'test-person-2',
          type: 'SPOUSE',
          treeId: 'test-tree-id'
        }
      });
    });
    
    it('should return all relationships for a person', async () => {
      // Arrange
      const url = new URL('http://localhost:3000/api/relationships?personId=test-person-1');
      const event = createRequestEvent({ url });
      
      // Act
      const response = await GET(event);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.relationships).toBeDefined();
      expect(data.relationships).toHaveLength(2);
    });
    
    it('should filter relationships by type', async () => {
      // Arrange
      const url = new URL('http://localhost:3000/api/relationships?personId=test-person-1&type=SPOUSE');
      const event = createRequestEvent({ url });
      
      // Act
      const response = await GET(event);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.relationships).toHaveLength(1);
      expect(data.relationships[0].type).toBe('SPOUSE');
    });
    
    it('should return 400 if personId is missing', async () => {
      // Arrange
      const url = new URL('http://localhost:3000/api/relationships');
      const event = createRequestEvent({ url });
      
      // Act
      const response = await GET(event);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
  
  describe('DELETE endpoint', () => {
    let relationshipId: string;
    
    beforeEach(async () => {
      // Create test relationship
      const relationship = await prisma.relationship.create({
        data: {
          fromPersonId: 'test-person-1',
          toPersonId: 'test-person-2',
          type: 'SIBLING',
          treeId: 'test-tree-id'
        }
      });
      relationshipId = relationship.id;
    });
    
    it('should delete a relationship', async () => {
      // Arrange
      const url = new URL(`http://localhost:3000/api/relationships?id=${relationshipId}`);
      const event = createRequestEvent({ url, method: 'DELETE' });
      
      // Act
      const response = await DELETE(event);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Verify database state
      const relationship = await prisma.relationship.findUnique({
        where: { id: relationshipId }
      });
      expect(relationship).toBeNull();
    });
    
    it('should return 400 if id is missing', async () => {
      // Arrange
      const url = new URL('http://localhost:3000/api/relationships');
      const event = createRequestEvent({ url, method: 'DELETE' });
      
      // Act
      const response = await DELETE(event);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });
});
