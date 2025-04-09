import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../../test/setup';

// Mock prisma client - must be at the top level
vi.mock('$lib/server/prismaservice', () => ({
  prisma
}));

import { POST } from './+server';
import { createRequestEvent, createJsonRequest } from '../../../test/utils';

describe('Node API with Relationships', () => {
  describe('POST endpoint with relationship data', () => {
    it('should create a node and parent-child relationship', async () => {
      // Arrange
      const requestBody = {
        personId: 'test-person-1',
        treeId: 'test-tree-id',
        x: 100,
        y: 200,
        relatedToPersonId: 'test-person-2',
        relationType: 'PARENT'
      };
      
      const request = createJsonRequest('/api/nodes', requestBody);
      const event = createRequestEvent({ request });
      
      // Act
      const response = await POST(event);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.relationshipCreated).toBe(true);
      expect(data.node).toBeDefined();
      
      // Verify database state - check if the relationship was created
      const familyRelation = await prisma.familyRelation.findFirst({
        where: {
          parentId: 'test-person-1',
          childId: 'test-person-2'
        }
      });
      expect(familyRelation).not.toBeNull();
    });
    
    it('should create a node and child-parent relationship', async () => {
      // Arrange
      const requestBody = {
        personId: 'test-person-1',
        treeId: 'test-tree-id',
        x: 100,
        y: 200,
        relatedToPersonId: 'test-person-2',
        relationType: 'CHILD'
      };
      
      const request = createJsonRequest('/api/nodes', requestBody);
      const event = createRequestEvent({ request });
      
      // Act
      const response = await POST(event);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.relationshipCreated).toBe(true);
      
      // Verify database state - check if the relationship was created
      const familyRelation = await prisma.familyRelation.findFirst({
        where: {
          parentId: 'test-person-2',
          childId: 'test-person-1'
        }
      });
      expect(familyRelation).not.toBeNull();
    });
    
    it('should create a node and sibling relationship', async () => {
      // Arrange
      const requestBody = {
        personId: 'test-person-1',
        treeId: 'test-tree-id',
        x: 100,
        y: 200,
        relatedToPersonId: 'test-person-2',
        relationType: 'SIBLING'
      };
      
      const request = createJsonRequest('/api/nodes', requestBody);
      const event = createRequestEvent({ request });
      
      // Act
      const response = await POST(event);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.relationshipCreated).toBe(true);
      
      // Verify database state - check if the relationship was created
      const relationship = await prisma.relationship.findFirst({
        where: {
          fromPersonId: 'test-person-1',
          toPersonId: 'test-person-2',
          type: 'SIBLING'
        }
      });
      expect(relationship).not.toBeNull();
    });
    
    it('should create a node without relationship if no relationship data is provided', async () => {
      // Arrange
      const requestBody = {
        personId: 'test-person-1',
        treeId: 'test-tree-id',
        x: 100,
        y: 200
      };
      
      const request = createJsonRequest('/api/nodes', requestBody);
      const event = createRequestEvent({ request });
      
      // Act
      const response = await POST(event);
      const data = await response.json();
      
      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.relationshipCreated).toBe(undefined);
      expect(data.node).toBeDefined();
      
      // Verify no relationships were created
      const familyRelations = await prisma.familyRelation.findMany({
        where: {
          OR: [
            { parentId: 'test-person-1' },
            { childId: 'test-person-1' }
          ]
        }
      });
      expect(familyRelations.length).toBe(0);
      
      const relationships = await prisma.relationship.findMany({
        where: {
          OR: [
            { fromPersonId: 'test-person-1' },
            { toPersonId: 'test-person-1' }
          ]
        }
      });
      expect(relationships.length).toBe(0);
    });
  });
});
