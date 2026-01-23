import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export class DbService {
    private static instance: DbService;
    private prisma: PrismaClient;

    private constructor() {
        this.prisma = new PrismaClient();
    }

    public static getInstance(): DbService {
        if (!DbService.instance) {
            DbService.instance = new DbService();
        }
        return DbService.instance;
    }

    public async connect(): Promise<void> {
        try {
            await this.prisma.$connect();
            logger.info('Database connected successfully');
        } catch (error) {
            logger.error('Failed to connect to database:', error);
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        await this.prisma.$disconnect();
    }

    public get client(): PrismaClient {
        return this.prisma;
    }
}
