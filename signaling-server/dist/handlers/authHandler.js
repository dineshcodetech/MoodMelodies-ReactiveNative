"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchUser = exports.loginOrSignup = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dbService_1 = require("../services/dbService");
const logger_1 = require("../utils/logger");
const db = dbService_1.DbService.getInstance().client;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';
const loginOrSignup = async (req, res) => {
    const { phoneNumber, name } = req.body;
    if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number is required' });
    }
    try {
        let user = await db.user.findUnique({
            where: { phoneNumber },
        });
        if (user) {
            // Update name if provided and user exists
            if (name && user.name !== name) {
                user = await db.user.update({
                    where: { id: user.id },
                    data: { name },
                });
            }
        }
        else {
            // Create new user
            user = await db.user.create({
                data: {
                    phoneNumber,
                    name: name || `User_${phoneNumber.slice(-4)}`,
                    status: 'online',
                },
            });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user.id, phoneNumber: user.phoneNumber }, JWT_SECRET);
        return res.json({
            token,
            user: {
                id: user.id,
                phoneNumber: user.phoneNumber,
                name: user.name,
                status: user.status,
            },
        });
    }
    catch (error) {
        logger_1.logger.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.loginOrSignup = loginOrSignup;
const searchUser = async (req, res) => {
    const { phoneNumber } = req.query;
    if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number is required' });
    }
    try {
        const user = await db.user.findUnique({
            where: { phoneNumber: phoneNumber },
            select: {
                id: true,
                phoneNumber: true,
                name: true,
                status: true,
                avatar: true,
            },
        });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        return res.json(user);
    }
    catch (error) {
        logger_1.logger.error('Search user error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
exports.searchUser = searchUser;
//# sourceMappingURL=authHandler.js.map