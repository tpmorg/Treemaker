import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prismaservice';
import type { Person } from '$lib/types';

export const POST: RequestHandler = async ({ request, locals }) => {
    // Check if user is authenticated
    if (!locals.user) {
        return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const data = await request.json();
        
        // Validate required fields
        if (!data.firstName) {
            return json({ success: false, error: 'First name is required' }, { status: 400 });
        }
        
        if (!data.treeId) {
            return json({ success: false, error: 'Tree ID is required' }, { status: 400 });
        }
        
        // Verify the tree exists and belongs to the user
        const tree = await prisma.tree.findUnique({
            where: {
                id: data.treeId,
                ownerId: locals.user.id
            }
        });
        
        if (!tree) {
            return json({ success: false, error: 'Tree not found or access denied' }, { status: 404 });
        }
        
        // Process dates if provided
        let birthDate = data.birthDate ? new Date(data.birthDate) : undefined;
        let deathDate = data.deathDate ? new Date(data.deathDate) : undefined;
        
        // Prepare person data
        const personData: any = {
            firstName: data.firstName,
            lastName: data.lastName || null,
            birthDate,
            deathDate,
            gender: data.gender || null,
            notes: data.notes || null,
            treeId: data.treeId
        };
        
        // If userId is provided, verify the user exists
        if (data.userId) {
            const userExists = await prisma.user.findUnique({
                where: { id: data.userId }
            });
            
            if (!userExists) {
                return json({ success: false, error: 'User not found' }, { status: 404 });
            }
            
            // Add userId to person data
            personData.userId = data.userId;
        }
        
        // Create the person
        const person = await prisma.person.create({
            data: personData
        });
        
        return json({ 
            success: true, 
            person: {
                id: person.id,
                firstName: person.firstName,
                lastName: person.lastName,
                birthDate: person.birthDate,
                deathDate: person.deathDate,
                gender: person.gender,
                notes: person.notes,
                treeId: person.treeId,
                createdAt: person.createdAt
            }
        });
    } catch (error) {
        console.error('Error creating person:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return json({ success: false, error: message }, { status: 500 });
    }
};

// Get all people for a specific tree
export const GET: RequestHandler = async ({ url, locals }) => {
    // Check if user is authenticated
    if (!locals.user) {
        return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const treeId = url.searchParams.get('treeId');
        
        if (!treeId) {
            return json({ success: false, error: 'Tree ID is required' }, { status: 400 });
        }
        
        // Verify the tree exists and belongs to the user
        const tree = await prisma.tree.findUnique({
            where: {
                id: treeId,
                ownerId: locals.user.id
            }
        });
        
        if (!tree) {
            return json({ success: false, error: 'Tree not found or access denied' }, { status: 404 });
        }
        
        // Get all people for the tree
        const people = await prisma.person.findMany({
            where: {
                treeId
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        
        return json({ success: true, people });
    } catch (error) {
        console.error('Error fetching people:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return json({ success: false, error: message }, { status: 500 });
    }
};