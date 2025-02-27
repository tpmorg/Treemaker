/**
 * Sanitizes user data for client-side use by removing binary fields
 * and selecting only the fields needed on the client
 */
export function sanitizeUserForClient(user: any) {
    if (!user) return null;
    return {
        id: user.id,
        userId: user.userId,
        email: user.email,
        username: user.username,
        emailVerified: user.emailVerified
        // totpKey and recoveryCode are intentionally omitted
    };
}