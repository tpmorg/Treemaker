import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prismaservice';
import { authenticator } from 'otplib';

export const POST: RequestHandler = async ({ request, locals }) => {
    try {
        if (!locals.user) {
            return json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        const { code } = await request.json();

        // Get user with TOTP key
        const user = await prisma.user.findUnique({
            where: { id: locals.user.id },
            select: { totp_key: true }
        });

        if (!user?.totp_key) {
            return json(
                { success: false, error: 'No 2FA setup in progress' },
                { status: 400 }
            );
        }

        // Convert stored Buffer to string
        const secret = user.totp_key.toString();

        // Verify the TOTP code
        const isValid = authenticator.verify({
            token: code,
            secret: secret
        });

        if (!isValid) {
            return json(
                { success: false, error: 'Invalid verification code' },
                { status: 400 }
            );
        }

        // Update user to mark 2FA as enabled
        await prisma.user.update({
            where: { id: locals.user.id },
            data: { email_verified: 1 } // Using email_verified as 2FA flag for now
        });

        return json({ success: true });
    } catch (error) {
        console.error('2FA verification error:', error);
        return json(
            { success: false, error: 'Failed to verify 2FA' },
            { status: 500 }
        );
    }
};