import type { RequestEvent } from '@sveltejs/kit';

import { sanitizeUserForClient } from '$lib/utils/userUtils';

export const load = async ({ locals }: RequestEvent) => {
    return {
        user: sanitizeUserForClient(locals.user)
    };
};