import { auth } from '$lib/server/lucia';
import type { Handle } from '@sveltejs/kit';

// Sanitize user data by excluding sensitive fields and converting binary data
function sanitizeUser(user: any) {
    if (!user) return null;
    const { recoveryCode, ...safeUser } = user;
    return {
        ...safeUser,
        // Only include fields we need on the client
        userId: user.userId,
        email: user.email,
        username: user.username,
        emailVerified: user.emailVerified
    };
}

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get(auth.sessionCookieName);
	if (!sessionId || sessionId === '') {
		event.locals.auth = auth;
		event.locals.user = null;
		event.locals.session = null;
		return await resolve(event);
	}

	const { session, user } = await auth.validateSession(sessionId);
	if (session && session.fresh) {
		const sessionCookie = auth.createSessionCookie(session.id);
		event.cookies.set(auth.sessionCookieName, sessionCookie.value, {
			path: '/',
			...sessionCookie.attributes
		});
	}
	if (!session) {
		const sessionCookie = auth.createBlankSessionCookie();
		event.cookies.set(sessionCookie.name, sessionCookie.value, {
			path: '/',
			...sessionCookie.attributes
		});
	}
	event.locals.auth = auth;
	event.locals.user = sanitizeUser(user);
	event.locals.session = session;
	return await resolve(event);
};