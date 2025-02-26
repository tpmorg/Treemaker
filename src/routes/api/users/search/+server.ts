import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prismaservice';

export const GET: RequestHandler = async ({ url, locals }) => {
    // Check authentication
    if (!locals.user) {
        return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const searchQuery = url.searchParams.get('query') || '';
        
        // Search users by email or username
        const users = await prisma.user.findMany({
            where: {
                OR: [
                    { email: { contains: searchQuery } },
                    { username: { contains: searchQuery } }
                ]
            },
            select: {
                id: true,
                email: true,
                username: true
            },
            take: 10
        });
        
        return json({ success: true, users });
    } catch (error) {
        console.error('Error searching users:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return json({ success: false, error: message }, { status: 500 });
    }
};