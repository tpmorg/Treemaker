import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { prisma } from '$lib/server/prismaservice';
import type { Media } from '$lib/types';

// Get media for multiple people
export const GET: RequestHandler = async ({ url, locals }) => {
    // Check if user is authenticated
    if (!locals.user) {
        return json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    try {
        const personIds = url.searchParams.get('personIds');
        
        if (!personIds) {
            return json({ success: false, error: 'Person IDs are required' }, { status: 400 });
        }
        
        // Split the comma-separated list of person IDs
        const personIdArray = personIds.split(',');
        
        // Get media for all the specified people
        const media = await prisma.media.findMany({
            where: {
                personId: {
                    in: personIdArray
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });
        
        // Verify access permissions - ensure all media belongs to trees owned by the user
        const personToTreeMap = await prisma.person.findMany({
            where: {
                id: {
                    in: personIdArray
                }
            },
            select: {
                id: true,
                tree: {
                    select: {
                        ownerId: true
                    }
                }
            }
        });
        
        // Ensure user exists (TypeScript check)
        if (!locals.user) {
            return json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Check if all trees are owned by the user
        const hasAccess = personToTreeMap.every(p => p.tree.ownerId === locals.user?.id);
        
        if (!hasAccess) {
            return json({ success: false, error: 'Access denied to one or more items' }, { status: 403 });
        }
        
        return json({ success: true, media });
    } catch (error) {
        console.error('Error fetching media for multiple people:', error);
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return json({ success: false, error: message }, { status: 500 });
    }
};