"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const campaignSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    shortDescription: { type: String, required: true },
    fullDescription: { type: String, required: true },
    budget: { type: Number, required: true },
    channels: { type: [String], default: [] },
    launchDate: { type: Date, required: true, default: Date.now },
    status: {
        type: String,
        enum: ['Planning', 'Active', 'Paused', 'Completed'],
        default: 'Planning'
    },
    cpc: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    ctr: { type: Number, default: 0 },
    impressions: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    brandProfile: { type: mongoose_1.Schema.Types.ObjectId, ref: 'BrandProfile' },
    owner: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
});
exports.default = (0, mongoose_1.model)('Campaign', campaignSchema);
