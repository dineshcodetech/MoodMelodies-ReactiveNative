import { PrismaClient } from '@prisma/client';
export declare class DbService {
    private static instance;
    private prisma;
    private constructor();
    static getInstance(): DbService;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    get client(): PrismaClient;
}
//# sourceMappingURL=dbService.d.ts.map