"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbService = void 0;
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
class DbService {
    static instance;
    prisma;
    constructor() {
        this.prisma = new client_1.PrismaClient();
    }
    static getInstance() {
        if (!DbService.instance) {
            DbService.instance = new DbService();
        }
        return DbService.instance;
    }
    async connect() {
        try {
            await this.prisma.$connect();
            logger_1.logger.info('Database connected successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to connect to database:', error);
            throw error;
        }
    }
    async disconnect() {
        await this.prisma.$disconnect();
    }
    get client() {
        return this.prisma;
    }
}
exports.DbService = DbService;
//# sourceMappingURL=dbService.js.map