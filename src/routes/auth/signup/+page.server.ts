import { auth } from '$lib/server/lucia';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { userService } from '../../services/userservice';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    throw redirect(302, '/');
  }
  return {
    user: locals.user
  };
};

export const actions = {
  default: async ({ request, cookies }) => {
    const formData = await request.formData();
    const email = formData.get('email');
    const username = formData.get('username');
    const password = formData.get('password');

    // basic validation
    if (
      typeof email !== 'string' ||
      typeof username !== 'string' ||
      typeof password !== 'string' ||
      !email ||
      !username ||
      !password
    ) {
      return fail(400, {
        message: 'Invalid input'
      });
    }

    try {
      // Create user through UserService
      const user = await userService.createUser({
        email,
        username,
        password
      });
      
      const session = await auth.createSession(user.id, { two_factor_verified: 0 });
      
      const sessionCookie = auth.createSessionCookie(session.id);
      cookies.set(sessionCookie.name, sessionCookie.value, {
        path: '.',
        ...sessionCookie.attributes
      });
    } catch (e) {
      if (e instanceof Error) {
        return fail(400, {
          message: e.message
        });
      }
      
      console.error('Signup error:', e);
      return fail(500, {
        message: 'An error occurred while creating your account'
      });
    }
    throw redirect(302, '/');
  }
} satisfies Actions;