import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { userService } from '$lib/server/userservice';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const data = await request.json();
        const user = await userService.createUser(data);
        
        return json({ 
            success: true, 
            user: {
                id: user.id,
                email: user.email,
                username: user.username
            }
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'An unexpected error occurred';
        return json({ success: false, error: message }, { status: 400 });
    }
};