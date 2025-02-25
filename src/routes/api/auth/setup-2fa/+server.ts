import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma } from '$lib/server/prismaservice';
import { authenticator } from 'otplib';
import { generateQrCode } from '$lib/server/qrcode';

export const POST: RequestHandler = async ({ locals }) => {
    try {
        if (!locals.user) {
            return json(
                { success: false, error: 'Not authenticated' },
                { status: 401 }
            );
        }

        // Generate secret
        const secret = authenticator.generateSecret();

        // Generate otpauth URL for QR code
        const uri = authenticator.keyuri(locals.user.email, 
            'Family Tree Maker', secret);

        // Generate QR code
        const qrCode = await generateQrCode(uri);

        // Store TOTP secret temporarily (not enabled yet)
        await prisma.user.update({
            where: { id: locals.user.id },
            data: { totp_key: Buffer.from(secret) }
        });

        return json({
            success: true,
            qrCode
        });
    } catch (error) {
        console.error('2FA setup error:', error);
        return json(
            { success: false, error: 'Failed to setup 2FA' },
            { status: 500 }
        );
    }
};