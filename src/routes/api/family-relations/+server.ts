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
        const { parentId, childId, relationType, treeId } = data;
        
        if (!parentId || !childId || !relationType || !treeId) {
            return json({ 
                success: false, 
                error: 'Parent ID, Child ID, Relation Type, and Tree ID are required' 
            }, { status: 400 });
        }
        
        // Validate the relation type
        const validRelationTypes = ['BIOLOGICAL', 'ADOPTIVE', 'STEP', 'FOSTER'];
        if (!validRelationTypes.includes(relationType)) {
            return json({ 
                success: false, 
                error: `Relation type must be one of: ${validRelationTypes.join(', ')}` 
            }, { status: 400 });
        }
        
        // Check if the relation already exists
        const existingRelation = await prisma.familyRelation.findFirst({
            where: {
                parentId,
                childId,
                relationType
            }
        });
        
        if (existingRelation) {
            return json({ 
                success: false, 
                error: 'This family relation already exists' 
            }, { status: 400 });
        }
        
        // Create the relation
        const relation = await prisma.familyRelation.create({
            data: {
                parentId,
                childId,
                relationType,
                treeId
            }
        });
        
        return json({ success: true, relation });
    } catch (error) {
        console.error('Error creating family relation:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return json({ success: false, error: message }, { status: 500 });
    }
};

// DELETE /api/family-relations/:id
export const DELETE: RequestHandler = async ({ params, locals }) => {
    if (!locals.user) {
        return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const { id } = params;
        
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