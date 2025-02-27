import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prismaservice';

// GET /api/relationships?personId=123&type=SPOUSE
// Get relationships for a person, optionally filtered by type
export const GET: RequestHandler = async ({ url, locals }) => {
    if (!locals.user) {
        return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const personId = url.searchParams.get('personId');
        const type = url.searchParams.get('type');
        
        if (!personId) {
            return json({ success: false, error: 'Person ID is required' }, { status: 400 });
        }
        
        const whereClause: any = {
            OR: [
                { fromPersonId: personId },
                { toPersonId: personId }
            ]
        };
        
        if (type) {
            whereClause.type = type;
        }
        
        const relationships = await prisma.relationship.findMany({
            where: whereClause,
            include: {
                fromPerson: true,
                toPerson: true
            }
        });
        
        // Format the relationships to show the related person
        const formattedRelationships = relationships.map(rel => {
            const isFromPerson = rel.fromPersonId === personId;
            const relatedPerson = isFromPerson ? rel.toPerson : rel.fromPerson;
            
            return {
                ...rel,
                relatedPerson,
                direction: isFromPerson ? 'from' : 'to'
            };
        });
        
        return json({
            success: true,
            relationships: formattedRelationships
        });
    } catch (error) {
        console.error('Error getting relationships:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return json({ success: false, error: message }, { status: 500 });
    }
};

// POST /api/relationships
// Create a new relationship
export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const data = await request.json();
        const { fromPersonId, toPersonId, type, subtype, treeId, startDate, endDate } = data;
        
        if (!fromPersonId || !toPersonId || !type || !treeId) {
            return json({ 
                success: false, 
                error: 'From Person ID, To Person ID, Type, and Tree ID are required' 
            }, { status: 400 });
        }
        
        // Validate the type
        const validTypes = ['SPOUSE', 'SIBLING'];
        if (!validTypes.includes(type)) {
            return json({ 
                success: false, 
                error: `Type must be one of: ${validTypes.join(', ')}` 
            }, { status: 400 });
        }
        
        // Check if the relationship already exists
        const existingRelationship = await prisma.relationship.findFirst({
            where: {
                OR: [
                    {
                        fromPersonId,
                        toPersonId,
                        type
                    },
                    {
                        fromPersonId: toPersonId,
                        toPersonId: fromPersonId,
                        type
                    }
                ]
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
                type,
                subtype,
                treeId,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null
            }
        });
        
        return json({ success: true, relationship });
    } catch (error) {
        console.error('Error creating relationship:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return json({ success: false, error: message }, { status: 500 });
    }
};

// DELETE /api/relationships/:id
export const DELETE: RequestHandler = async ({ params, locals }) => {
    if (!locals.user) {
        return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const { id } = params;
        
        if (!id) {
            return json({ success: false, error: 'Relationship ID is required' }, { status: 400 });
        }
        
        // Delete the relationship
        await prisma.relationship.delete({
            where: { id }
        });
        
        return json({ success: true });
    } catch (error) {
        console.error('Error deleting relationship:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return json({ success: false, error: message }, { status: 500 });
    }
};