import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { auth } from '$lib/server/lucia';
import { Argon2id } from 'oslo/password';
import { prisma } from '$lib/server/prismaservice';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
    try {
        const { email, password } = await request.json();

        // Find user by email
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
            include: { key: { select: { hashed_password: true } } }
        });

        if (!user?.key?.[0]?.hashed_password) {
            return json(
                { success: false, error: 'Invalid email or password' },
                { status: 400 }
            );
        }

        // Verify password
        const validPassword = await new Argon2id().verify(
            user.key[0].hashed_password,
            password
        );

        if (!validPassword) {
            return json(
                { success: false, error: 'Invalid email or password' },
                { status: 400 }
            );
        }

        // Create new session
        const session = await auth.createSession(user.id, { two_factor_verified: 0 });
        const sessionCookie = auth.createSessionCookie(session.id);

        // Set the session cookie
        cookies.set(sessionCookie.name, sessionCookie.value, {
            path: '/',
            ...sessionCookie.attributes
        });

        // Update locals
        locals.session = session;
        

        return json({ success: true });
    } catch (error) {
        console.error('Login error:', error);
        return json(
            { success: false, error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
};