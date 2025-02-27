import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prismaservice';

export const GET: RequestHandler = async ({ url, locals }) => {

    if (!locals.user) {
        return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const searchQuery = url.searchParams.get('query') || '';
        const treeId = url.searchParams.get('treeId');
        
        // Build the where clause
        let whereClause: any = {
            OR: [
                { firstName: { contains: searchQuery } },
                { lastName: { contains: searchQuery } }
            ]
        };
        
       
        
        // Search people by name, optionally filtered by tree
        const people = await prisma.person.findMany({
            where: whereClause,
            select: {
                id: true,
                firstName: true,
                lastName: true,
                treeId: true
            },
            take: 10
        });
        
        return json({ success: true, people });
    } catch (error) {
        console.error('Error searching users:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return json({ success: false, error: message }, { status: 500 });
    }
};