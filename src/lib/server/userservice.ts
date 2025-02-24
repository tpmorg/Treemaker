import { prisma } from '$lib/server/prismaservice';
import type { User } from '@prisma/client';
import { generateId } from 'lucia';
import { Argon2id } from 'oslo/password';

export interface CreateUserInput {
    email: string;
    username: string;
    password: string;
}

export class UserService {
    private static instance: UserService;

    private constructor() {}

    public static getInstance(): UserService {
        if (!UserService.instance) {
            UserService.instance = new UserService();
        }
        return UserService.instance;
    }

    async createUser(input: CreateUserInput): Promise<User> {
        const { email, username, password } = input;
        
        // Validate input
        if (!email || !username || !password) {
            throw new Error('Missing required fields');
        }

        if (password.length < 6) {
            throw new Error('Password must be at least 6 characters long');
        }

        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        // Hash password
        const hashedPassword = await new Argon2id().hash(password);
        const userId = generateId(15);

        // Create user with all required fields
        const user = await prisma.user.create({
            data: {
                id: userId,
                email: email.toLowerCase(),
                username,
                email_verified: 0,
                totp_key: null,
                recovery_code: Buffer.from(crypto.getRandomValues(new Uint8Array(32))),
                key: {
                    create: {
                        id: `email:${email.toLowerCase()}`,
                        hashed_password: hashedPassword
                    }
                }
            }
        });

        return user;
    }

    async getUserById(id: string): Promise<User | null> {
        return prisma.user.findUnique({
            where: { id }
        });
    }

    async getUserByEmail(email: string): Promise<User | null> {
        return prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });
    }

    async updateUser(id: string, data: Partial<User>): Promise<User> {
        return prisma.user.update({
            where: { id },
            data
        });
    }
}

// Export a singleton instance
export const userService = UserService.getInstance();