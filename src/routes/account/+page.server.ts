import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/server/prismaservice';
import { sanitizeUserForClient } from '$lib/utils/userUtils';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        throw redirect(302, '/');
    }

    // Fetch the user's trees
    const trees = await prisma.tree.findMany({
        where: {
            ownerId: locals.user.id
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    return {
        user: sanitizeUserForClient(locals.user),
        trees
    };
};