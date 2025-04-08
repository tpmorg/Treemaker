import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../../test/setup';

// Mock prisma client - must be at the top level
vi.mock('$lib/server/prismaservice', () => ({
  prisma
}));

import { POST, GET, DELETE } from './+server';
import { createRequestEvent, createJsonRequest } from '../../../test/utils';

describe('Family Relations API', () => {
  describe('POST endpoint', () => {
    it('should create a parent-child relation with parentId/childId format', async () => {
      // Arrange
      const requestBody = {
        parentId: 'test-person-1',
        childId: 'test-person-2',
        relationType: 'BIOLOGICAL',
        treeId: 'test-tree-id'
      };
      
      const request = createJsonRequest('/api/family-relations', requestBody);
      const event = createRequestEvent({ request });
      
      // Act
      const response = await POST(event);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.relation).toBeDefined();
      expect(data.relation.parentId).toBe('test-person-1');
      expect(data.relation.childId).toBe('test-person-2');
      
      // Verify database state
      const relation = await prisma.familyRelation.findFirst({
        where: {
          parentId: 'test-person-1',
          childId: 'test-person-2'
        }
      });
      expect(relation).not.toBeNull();
    });
    
    it('should create a parent-child relation with fromPersonId/toPersonId format', async () => {
      // Arrange
      const requestBody = {
        fromPersonId: 'test-person-1',
        toPersonId: 'test-person-2',
        relationshipType: 'FAMILY',
        relationType: 'BIOLOGICAL',
        treeId: 'test-tree-id'
      };
      
      const request = createJsonRequest('/api/family-relations', requestBody);
      const event = createRequestEvent({ request });
      
      // Act
      const response = await POST(event);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Verify database state
      const relation = await prisma.familyRelation.findFirst({
        where: {
          parentId: 'test-person-1',
          childId: 'test-person-2'
        }
      });
      expect(relation).not.toBeNull();
    });
    
    it('should return 400 if relation already exists', async () => {
      // Arrange - Create relation first
      await prisma.familyRelation.create({
        data: {
          parentId: 'test-person-1',
          childId: 'test-person-2',
          relationType: 'BIOLOGICAL',
          treeId: 'test-tree-id'
        }
      });
      
      const requestBody = {
        parentId: 'test-person-1',
        childId: 'test-person-2',
        relationType: 'BIOLOGICAL',
        treeId: 'test-tree-id'
      };
      
      const request = createJsonRequest('/api/family-relations', requestBody);
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
      // Arrange - Missing treeId
      const requestBody = {
        parentId: 'test-person-1',
        childId: 'test-person-2',
        relationType: 'BIOLOGICAL'
      };
      
      const request = createJsonRequest('/api/family-relations', requestBody);
      const event = createRequestEvent({ request });
      
      // Act
      const response = await POST(event);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
    
    it('should default to BIOLOGICAL if relationType not specified', async () => {
      // Arrange
      const requestBody = {
        parentId: 'test-person-1',
        childId: 'test-person-2',
        treeId: 'test-tree-id'
      };
      
      const request = createJsonRequest('/api/family-relations', requestBody);
      const event = createRequestEvent({ request });
      
      // Act
      const response = await POST(event);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Verify database state
      const relation = await prisma.familyRelation.findFirst({
        where: {
          parentId: 'test-person-1',
          childId: 'test-person-2'
        }
      });
      expect(relation).not.toBeNull();
      expect(relation?.relationType).toBe('BIOLOGICAL');
    });
  });
  
  describe('GET endpoint', () => {
    beforeEach(async () => {
      // Create test relations
      await prisma.familyRelation.create({
        data: {
          parentId: 'test-person-1',
          childId: 'test-person-2',
          relationType: 'BIOLOGICAL',
          treeId: 'test-tree-id'
        }
      });
    });
    
    it('should return family members for a person', async () => {
      // Arrange
      const url = new URL('http://localhost:3000/api/family-relations?personId=test-person-2');
      const event = createRequestEvent({ url });
      
      // Act
      const response = await GET(event);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.familyMembers).toBeDefined();
      expect(data.familyMembers.parents).toHaveLength(1);
      expect(data.familyMembers.parents[0].id).toBe('test-person-1');
    });
    
    it('should return 400 if personId is missing', async () => {
      // Arrange
      const url = new URL('http://localhost:3000/api/family-relations');
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
    let relationId: string;
    
    beforeEach(async () => {
      // Create test relation
      const relation = await prisma.familyRelation.create({
        data: {
          parentId: 'test-person-1',
          childId: 'test-person-2',
          relationType: 'BIOLOGICAL',
          treeId: 'test-tree-id'
        }
      });
      relationId = relation.id;
    });
    
    it('should delete a relation', async () => {
      // Arrange
      const url = new URL(`http://localhost:3000/api/family-relations?id=${relationId}`);
      const event = createRequestEvent({ url, method: 'DELETE' });
      
      // Act
      const response = await DELETE(event);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Verify database state
      const relation = await prisma.familyRelation.findUnique({
        where: { id: relationId }
      });
      expect(relation).toBeNull();
    });
    
    it('should return 400 if id is missing', async () => {
      // Arrange
      const url = new URL('http://localhost:3000/api/family-relations');
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
