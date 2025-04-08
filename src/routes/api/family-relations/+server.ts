import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prismaservice';

// GET /api/family-relations?personId=123
// Get all family relations for a person
export const GET: RequestHandler = async ({ url, locals }) => {
    if (!locals.user) {
        return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const personId = url.searchParams.get('personId');
        
        if (!personId) {
            return json({ success: false, error: 'Person ID is required' }, { status: 400 });
        }
        
        // Get parent relations (where person is the child)
        const parentRelations = await prisma.familyRelation.findMany({
            where: { childId: personId },
            include: {
                parent: true
            }
        });
        
        // Get child relations (where person is the parent)
        const childRelations = await prisma.familyRelation.findMany({
            where: { parentId: personId },
            include: {
                child: true
            }
        });
        
        // Get sibling and spouse relationships
        const relationships = await prisma.relationship.findMany({
            where: {
                OR: [
                    { fromPersonId: personId },
                    { toPersonId: personId }
                ]
            },
            include: {
                fromPerson: true,
                toPerson: true
            }
        });
        
        // Extract parents, children, siblings, and spouses
        const parents = parentRelations.map(relation => relation.parent);
        const children = childRelations.map(relation => relation.child);
        
        const siblings = relationships
            .filter(rel => rel.type === 'SIBLING')
            .map(rel => {
                return rel.fromPersonId === personId ? rel.toPerson : rel.fromPerson;
            });
            
        const spouses = relationships
            .filter(rel => rel.type === 'SPOUSE')
            .map(rel => {
                return rel.fromPersonId === personId ? rel.toPerson : rel.fromPerson;
            });
        
        return json({
            success: true,
            familyMembers: {
                parents,
                children,
                siblings,
                spouses
            }
        });
    } catch (error) {
        console.error('Error getting family relations:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return json({ success: false, error: message }, { status: 500 });
    }
};

// POST /api/family-relations
// Create a new family relation
export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const data = await request.json();
        
        // Handle both parameter formats for backward compatibility
        // Format 1: fromPersonId, toPersonId, relationshipType, relationType, treeId
        // Format 2: parentId, childId, relationType, treeId
        
        let fromPersonId = data.fromPersonId;
        let toPersonId = data.toPersonId;
        let relationshipType = data.relationshipType;
        let relationType = data.relationType;
        const treeId = data.treeId;
        
        // If using parentId/childId format, map to fromPersonId/toPersonId
        if (!fromPersonId && data.parentId) {
            fromPersonId = data.parentId;
        }
        
        if (!toPersonId && data.childId) {
            toPersonId = data.childId;
        }
        
        // If parentId/childId format is used but no relationshipType is provided, set it to 'FAMILY'
        if (!relationshipType && data.parentId && data.childId) {
            relationshipType = 'FAMILY';
        }
        
        // Validate required fields
        if (!fromPersonId || !toPersonId || !treeId) {
            return json({ 
                success: false, 
                error: 'Person IDs and Tree ID are required' 
            }, { status: 400 });
        }
        
        if (!relationshipType) {
            return json({ 
                success: false, 
                error: 'Relationship Type is required' 
            }, { status: 400 });
        }
        
        // Validate the relationship type
        const validRelationshipTypes = ['FAMILY', 'RELATIONSHIP', 'SPOUSE'];
        if (!validRelationshipTypes.includes(relationshipType)) {
            return json({ 
                success: false, 
                error: `Relationship type must be one of: ${validRelationshipTypes.join(', ')}` 
            }, { status: 400 });
        }
        
        // For FAMILY relationships, validate the relation type
        if (relationshipType === 'FAMILY') {
            if (!relationType) {
                // Default to BIOLOGICAL if not specified
                relationType = 'BIOLOGICAL';
            }
            
            const validRelationTypes = ['BIOLOGICAL', 'ADOPTIVE', 'STEP', 'FOSTER'];
            if (!validRelationTypes.includes(relationType)) {
                return json({ 
                    success: false, 
                    error: `Relation type must be one of: ${validRelationTypes.join(', ')}` 
                }, { status: 400 });
            }
        }

        if (relationshipType === 'FAMILY') {
                // Check if the family relation already exists
                const existingFamilyRelation = await prisma.familyRelation.findFirst({
                    where: {
                        parentId: fromPersonId,
                        childId: toPersonId,
                        relationType
                    }
                });
                
                if (existingFamilyRelation) {
                    return json({ 
                        success: false, 
                        error: 'This family relation already exists' 
                    }, { status: 400 });
                }
                
                // Create the family relation
                const familyRelation = await prisma.familyRelation.create({
                    data: {
                        parentId: fromPersonId,
                        childId: toPersonId,
                        relationType,
                        treeId
                    }
                });
                
                return json({ success: true, relation: familyRelation });
            } else if (relationshipType === 'RELATIONSHIP' || relationshipType === 'SPOUSE') {
                // Check if the relationship already exists
                const existingRelationship = await prisma.relationship.findFirst({
                    where: {
                        OR: [
                            { fromPersonId, toPersonId },
                            { fromPersonId: toPersonId, toPersonId: fromPersonId }
                        ],
                        type: relationshipType === 'SPOUSE' ? 'SPOUSE' : relationType
                    }
                });
                
                if (existingRelationship) {
                    return json({ 
                        success: false, 
                        error: 'This relationship already exists' 
                    }, { status: 400 });
                }
                
                // Create the relationship
                const relationship = await prisma.relationship.create({
                    data: {
                        fromPersonId,
                        toPersonId,
                        type: relationshipType === 'SPOUSE' ? 'SPOUSE' : relationType,
                        treeId
                    }
                });
                
                return json({ success: true, relation: relationship });
            }
            
            return json({ 
                success: false, 
                error: 'Invalid relationship type' 
            }, { status: 400 });
        }
    catch (error) {
        console.error('Error creating family relation:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return json({ success: false, error: message }, { status: 500 });
    }
};

// DELETE /api/family-relations
export const DELETE: RequestHandler = async ({ url, locals }) => {
    if (!locals.user) {
        return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const id = url.searchParams.get('id');
        
        if (!id) {
            return json({ success: false, error: 'Relation ID is required' }, { status: 400 });
        }
        
        // Delete the relation
        await prisma.familyRelation.delete({
            where: { id }
        });
        
        return json({ success: true });
    } catch (error) {
        console.error('Error deleting family relation:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return json({ success: false, error: message }, { status: 500 });
    }
};
