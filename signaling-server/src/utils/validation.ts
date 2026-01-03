import Joi from 'joi';
import { JoinRoomData, MatchmakingData } from '../types/socket.types';

const joinRoomSchema = Joi.object({
  userId: Joi.string().required().min(1).max(100),
  roomId: Joi.string().optional().min(1).max(100),
  language: Joi.string().required().valid('en', 'hi'), // Add more as needed
  deviceInfo: Joi.object({
    platform: Joi.string().valid('ios', 'android').required(),
    version: Joi.string().required()
  }).optional()
});

const matchmakingSchema = Joi.object({
  userId: Joi.string().required().min(1).max(100),
  language: Joi.string().required().valid('en', 'hi'),
  preferredLanguage: Joi.string().optional().valid('en', 'hi')
});

export function validateJoinRoom(data: JoinRoomData): string | null {
  const { error } = joinRoomSchema.validate(data);
  return error ? error.details[0].message : null;
}

export function validateMatchmaking(data: MatchmakingData): string | null {
  const { error } = matchmakingSchema.validate(data);
  return error ? error.details[0].message : null;
}


