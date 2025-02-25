import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prismaservice';
import type { Tree } from '$lib/types';

// Get all trees for the authenticated user
export const GET: RequestHandler = async ({ locals }) => {
    // Check if user is authenticated
    if (!locals.user) {
        return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        // Get all trees owned by the user
        const trees = await prisma.tree.findMany({
            where: {
                ownerId: locals.user.id
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        
        return json({ success: true, trees });
    } catch (error) {
        console.error('Error fetching trees:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return json({ success: false, error: message }, { status: 500 });
    }
};

// Create a new tree
export const POST: RequestHandler = async ({ request, locals }) => {
    // Check if user is authenticated
    if (!locals.user) {
        return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const data = await request.json();
        
        // Validate required fields
        if (!data.name) {
            return json({ success: false, error: 'Tree name is required' }, { status: 400 });
        }
        
        // Create the tree
        const tree = await prisma.tree.create({
            data: {
                name: data.name,
                description: data.description || null,
                ownerId: locals.user.id
            }
        });
        
        return json({ 
            success: true, 
            tree: {
                id: tree.id,
                name: tree.name,
                description: tree.description,
                createdAt: tree.createdAt
            }
        });
    } catch (error) {
        console.error('Error creating tree:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return json({ success: false, error: message }, { status: 500 });
    }
};