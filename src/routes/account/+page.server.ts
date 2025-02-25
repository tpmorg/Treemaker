import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user) {
        console.log(locals)
        console.log('/ACCOUNT: No session, redirecting to /')
        throw redirect(302, '/');
    }

    return {
        user: locals.user
    };
};