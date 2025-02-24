import { Lucia, type Session, type User } from 'lucia';
import { PrismaAdapter } from '@lucia-auth/adapter-prisma';
import { PrismaClient } from '@prisma/client';
import { dev } from '$app/environment';

const client = new PrismaClient();

const adapter = new PrismaAdapter(
  client.session,
  client.user
);

export const auth = new Lucia(
  adapter,
  {

    sessionCookie: {
      attributes: {
        secure: !dev
      }
    },
    getUserAttributes: (databaseUser) => ({
      userId: databaseUser.id,
      email: databaseUser.email,
      username: databaseUser.username,
      emailVerified: Boolean(databaseUser.email_verified),
      totpKey: databaseUser.totp_key,
      recoveryCode: databaseUser.recovery_code
    })
  }
);

export type Auth = typeof auth;

declare module 'lucia' {
  interface Register {
    Lucia: typeof auth;
    DatabaseUserAttributes: {
      id: string;
      email: string;
      username: string;
      email_verified: number;
      totp_key: Uint8Array | null;
      recovery_code: Uint8Array;
    };
    DatabaseSessionAttributes: {
      two_factor_verified: number;
    };
  }
}

declare global {
  namespace App {
    interface Locals {
      auth: typeof auth;
      user: User | null;
      session: Session | null;
    }
    interface PageData {
      user: User | null;
    }
  }
}