import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { auth } from '$lib/server/lucia';
import { Argon2id } from 'oslo/password';
import { prisma } from '$lib/server/prismaservice';

export const POST: RequestHandler = async ({ request, locals, cookies }) => {
    try {
        console.log('Login request received');
        
        // Parse request body
        let email, password;
        try {
            const body = await request.json();
            email = body.email;
            password = body.password;
            console.log('Request parsed successfully, email:', email);
        } catch (parseError) {
            console.error('Error parsing request body:', parseError);
            return json(
                { success: false, error: 'Invalid request format' },
                { status: 400 }
            );
        }

        if (!email || !password) {
            console.error('Missing email or password');
            return json(
                { success: false, error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Find user by email
        console.log('Finding user with email:', email.toLowerCase());
        try {
            const user = await prisma.user.findUnique({
                where: { email: email.toLowerCase() },
                include: { key: true }
            });

            console.log('User found:', !!user);
            
            if (!user) {
                console.log('User not found');
                return json(
                    { success: false, error: 'Invalid email or password' },
                    { status: 400 }
                );
            }
            
            console.log('User keys:', user.key);
            
            if (!user.key || user.key.length === 0) {
                console.log('User has no keys');
                return json(
                    { success: false, error: 'Account not properly set up. Please contact support.' },
                    { status: 400 }
                );
            }
            
            const userKey = user.key[0];
            console.log('User key found:', !!userKey, 'Has password:', !!userKey.hashed_password);
            
            if (!userKey.hashed_password) {
                console.log('User key has no password');
                return json(
                    { success: false, error: 'Account not properly set up. Please contact support.' },
                    { status: 400 }
                );
            }

            // Verify password
            console.log('Verifying password');
            try {
                const validPassword = await new Argon2id().verify(
                    userKey.hashed_password,
                    password
                );

                if (!validPassword) {
                    console.log('Invalid password');
                    return json(
                        { success: false, error: 'Invalid email or password' },
                        { status: 400 }
                    );
                }
                console.log('Password verified successfully');
            } catch (passwordError) {
                console.error('Error verifying password:', passwordError);
                return json(
                    { success: false, error: 'Error verifying credentials' },
                    { status: 500 }
                );
            }

            // Create new session
            console.log('Creating new session for user:', user.id);
            try {
                const session = await auth.createSession(user.id, { two_factor_verified: 0 });
                const sessionCookie = auth.createSessionCookie(session.id);

                // Set the session cookie
                console.log('Setting session cookie:', sessionCookie.name);
                cookies.set(sessionCookie.name, sessionCookie.value, {
                    path: '/',
                    ...sessionCookie.attributes
                });

                // Update locals
                locals.session = session;
                
                console.log('Login successful');
                return json({ success: true });
            } catch (sessionError) {
                console.error('Error creating session:', sessionError);
                return json(
                    { success: false, error: 'Error creating session' },
                    { status: 500 }
                );
            }
        } catch (dbError) {
            console.error('Database error:', dbError);
            return json(
                { success: false, error: 'Database error' },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('Login error:', error);
        return json(
            { success: false, error: 'An unexpected error occurred' },
            { status: 500 }
        );
    }
};
