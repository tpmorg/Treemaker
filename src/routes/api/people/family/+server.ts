import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prismaservice';
import type { PersonWithRelationships } from '$lib/types';

// GET /api/people/family?personId=123
// Get a person with all their family relationships
export const GET: RequestHandler = async ({ url, locals }) => {
    if (!locals.user) {
        return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const personId = url.searchParams.get('personId');
        
        if (!personId) {
            return json({ success: false, error: 'Person ID is required' }, { status: 400 });
        }
        
        // Get the person
        const person = await prisma.person.findUnique({
            where: { id: personId }
        });
        
        if (!person) {
            return json({ success: false, error: 'Person not found' }, { status: 404 });
        }
        
        // Get all family relations
        
        // 1. Get parents (where person is child)
        const parentRelations = await prisma.familyRelation.findMany({
            where: { childId: personId },
            include: { parent: true }
        });
        
        // 2. Get children (where person is parent)
        const childRelations = await prisma.familyRelation.findMany({
            where: { parentId: personId },
            include: { child: true }
        });
        
        // 3. Get siblings and spouses
        const personRelationships = await prisma.relationship.findMany({
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
        
        // Extract and organize the family members
        const parents = parentRelations.map(rel => {
            return {
                ...rel.parent,
                relationType: rel.relationType
            };
        });
        
        const children = childRelations.map(rel => {
            return {
                ...rel.child,
                relationType: rel.relationType
            };
        });
        
        const siblings = personRelationships
            .filter(rel => rel.type === 'SIBLING')
            .map(rel => {
                const isFromPerson = rel.fromPersonId === personId;
                return {
                    ...(isFromPerson ? rel.toPerson : rel.fromPerson),
                    relationType: rel.subtype || 'SIBLING'
                };
            });
            
        const spouses = personRelationships
            .filter(rel => rel.type === 'SPOUSE')
            .map(rel => {
                const isFromPerson = rel.fromPersonId === personId;
                return {
                    ...(isFromPerson ? rel.toPerson : rel.fromPerson),
                    startDate: rel.startDate,
                    endDate: rel.endDate
                };
            });
        
        // Combine everything into a PersonWithRelationships object
        const personWithFamily: PersonWithRelationships = {
            ...person,
            parents,
            children,
            siblings,
            spouses
        };
        
        return json({
            success: true,
            person: personWithFamily
        });
    } catch (error) {
        console.error('Error getting person family:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return json({ success: false, error: message }, { status: 500 });
    }
};