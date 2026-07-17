"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const brandProfileSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    industry: { type: String, required: true },
    targetAudience: { type: String, required: true },
    voiceTone: { type: String, required: true },
    goals: { type: String, required: true },
    owner: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
});
exports.default = (0, mongoose_1.model)('BrandProfile', brandProfileSchema);
