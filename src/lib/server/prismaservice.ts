import { PrismaClient } from '@prisma/client';

// Prevent multiple instances of Prisma Client in development
declare global {
    var prisma: PrismaClient | undefined;
}

export const prisma = global.prisma || new PrismaClient();

if (process.env.NODE_ENV === 'development') {
    global.prisma = prisma;
}

// Handle cleanup on application shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

// Handle cleanup on unhandled rejections and exceptions
process.on('unhandledRejection', async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});

process.on('uncaughtException', async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});

export default prisma;