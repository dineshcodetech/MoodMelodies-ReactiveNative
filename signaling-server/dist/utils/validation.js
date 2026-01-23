"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateJoinRoom = validateJoinRoom;
exports.validateMatchmaking = validateMatchmaking;
const joi_1 = __importDefault(require("joi"));
const joinRoomSchema = joi_1.default.object({
    userId: joi_1.default.string().required().min(1).max(100),
    roomId: joi_1.default.string().optional().min(1).max(100),
    language: joi_1.default.string().required().valid('en', 'hi'), // Add more as needed
    deviceInfo: joi_1.default.object({
        platform: joi_1.default.string().valid('ios', 'android').required(),
        version: joi_1.default.string().required()
    }).optional()
});
const matchmakingSchema = joi_1.default.object({
    userId: joi_1.default.string().required().min(1).max(100),
    language: joi_1.default.string().required().valid('en', 'hi'),
    preferredLanguage: joi_1.default.string().optional().valid('en', 'hi')
});
function validateJoinRoom(data) {
    const { error } = joinRoomSchema.validate(data);
    return error ? error.details[0].message : null;
}
function validateMatchmaking(data) {
    const { error } = matchmakingSchema.validate(data);
    return error ? error.details[0].message : null;
}
//# sourceMappingURL=validation.js.map