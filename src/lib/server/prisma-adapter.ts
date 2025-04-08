import type { Adapter, DatabaseSession, DatabaseUser, RegisteredDatabaseUserAttributes } from "lucia";
import type { PrismaClient, Session, User } from "@prisma/client";

export class CustomPrismaAdapter implements Adapter {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    async deleteSession(sessionId: string): Promise<void> {
        await this.prisma.session.delete({
            where: {
                id: sessionId
            }
        });
    }

    async deleteUserSessions(userId: string): Promise<void> {
        await this.prisma.session.deleteMany({
            where: {
                user_id: userId
            }
        });
    }

    async getSessionAndUser(
        sessionId: string
    ): Promise<[DatabaseSession | null, DatabaseUser | null]> {
        const result = await this.prisma.session.findUnique({
            where: {
                id: sessionId
            },
            include: {
                user: true
            }
        });

        if (!result) return [null, null];

        const { user, ...session } = result;
        return [
            transformIntoDatabaseSession(session),
            transformIntoDatabaseUser(user)
        ];
    }

    async getUserSessions(userId: string): Promise<DatabaseSession[]> {
        const sessions = await this.prisma.session.findMany({
            where: {
                user_id: userId
            }
        });
        return sessions.map(transformIntoDatabaseSession);
    }

    async setSession(session: DatabaseSession): Promise<void> {
        const now = Date.now();
        const thirtyDays = 1000 * 60 * 60 * 24 * 30;
        
        // Use the same expiration time for both active_expires and idle_expires
        // to be consistent with Lucia configuration
        await this.prisma.session.create({
            data: {
                id: session.id,
                user_id: session.userId,
                active_expires: BigInt(now + thirtyDays),
                idle_expires: BigInt(now + thirtyDays),
                ...session.attributes
            }
        });
    }

    async updateSessionExpiration(
        sessionId: string,
        expiresAt: Date
    ): Promise<void> {
        // Safely convert Date to BigInt
        const timestamp = expiresAt.getTime();
        
        try {
            await this.prisma.session.update({
                where: {
                    id: sessionId
                },
                data: {
                    active_expires: BigInt(timestamp),
                    idle_expires: BigInt(timestamp)
                }
            });
        } catch (error) {
            console.error("Error updating session expiration:", error);
            throw error;
        }
    }

    async deleteExpiredSessions(): Promise<void> {
        const now = BigInt(Date.now());
        await this.prisma.session.deleteMany({
            where: {
                OR: [
                    {
                        active_expires: {
                            lte: now
                        }
                    },
                    {
                        idle_expires: {
                            lte: now
                        }
                    }
                ]
            }
        });
    }
}

function transformIntoDatabaseSession(raw: Session): DatabaseSession {
    const { id, user_id, active_expires, idle_expires, ...attributes } = raw;
    
    // Safely convert BigInt to number for Date constructor
    // This handles potential large BigInt values
    const expiresAtTimestamp = typeof active_expires === 'bigint' 
        ? Number(active_expires)
        : Number(active_expires);
        
    return {
        id,
        userId: user_id,
        expiresAt: new Date(expiresAtTimestamp),
        attributes
    };
}

function transformIntoDatabaseUser(raw: User): DatabaseUser {
    const attributes: RegisteredDatabaseUserAttributes = {
        id: raw.id,
        email: raw.email,
        username: raw.username,
        email_verified: raw.email_verified,
        totp_key: raw.totp_key,
        recovery_code: raw.recovery_code
    };
    return {
        id: raw.id,
        attributes
    };
}
