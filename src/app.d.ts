/// <reference types="lucia" />
declare global {
	namespace App {
		interface Locals {
			auth: import('lucia').AuthRequest;
			user: import('lucia').User | null;
			session: import('lucia').Session | null;
		}
		interface PageData {
			user: import('lucia').User | null;
		}
	}
}

declare module 'lucia' {
	interface DatabaseUserAttributes {
		email: string;
		username: string;
		email_verified: number;
		totp_key: Uint8Array | null;
		recovery_code: Uint8Array;
	}
	interface DatabaseSessionAttributes {
		two_factor_verified: number;
	}
}

export {};
