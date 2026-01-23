import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { DbService } from '../services/dbService';
import { logger } from '../utils/logger';

const db = DbService.getInstance().client;
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export const loginOrSignup = async (req: Request, res: Response) => {
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
        } else {
            // Create new user
            user = await db.user.create({
                data: {
                    phoneNumber,
                    name: name || `User_${phoneNumber.slice(-4)}`,
                    status: 'online',
                },
            });
        }

        const token = jwt.sign({ userId: user.id, phoneNumber: user.phoneNumber }, JWT_SECRET);

        return res.json({
            token,
            user: {
                id: user.id,
                phoneNumber: user.phoneNumber,
                name: user.name,
                status: user.status,
            },
        });
    } catch (error) {
        logger.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

export const searchUser = async (req: Request, res: Response) => {
    const { phoneNumber } = req.query;

    if (!phoneNumber) {
        return res.status(400).json({ error: 'Phone number is required' });
    }

    try {
        const user = await db.user.findUnique({
            where: { phoneNumber: phoneNumber as string },
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
    } catch (error) {
        logger.error('Search user error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};
