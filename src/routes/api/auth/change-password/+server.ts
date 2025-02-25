import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { Argon2id } from 'oslo/password';
import { prisma } from '$lib/server/prismaservice';

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        if (!locals.user) {
            return json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const { currentPassword, newPassword } = await request.json();

        // Get user with password
        const user = await prisma.user.findUnique({
            where: { id: locals.user.id },
            include: { key: { select: { id: true, hashed_password: true } } }
        });

        if (!user?.key?.[0]?.hashed_password) {
            return json(
                { success: false, error: 'Invalid user data' },
                { status: 400 }
            );
        }

        // Verify current password
        const validPassword = await new Argon2id().verify(
            user.key[0].hashed_password,
            currentPassword
        );

        if (!validPassword) {
            return json(
                { success: false, error: 'Current password is incorrect' },
                { status: 400 }
            );
        }

        // Hash new password
        const hashedPassword = await new Argon2id().hash(newPassword);

        // Update password
        await prisma.key.update({
            where: { id: user.key[0].id },
            data: { hashed_password: hashedPassword }
        });

        return json({ success: true });
    } catch (error) {
        console.error('Password change error:', error);
        return json(
            { success: false, error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
};