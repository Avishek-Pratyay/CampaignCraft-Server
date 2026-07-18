"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const memoryDb_1 = require("../config/memoryDb");
const auth_1 = require("../middleware/auth");
const BrandProfile_1 = __importDefault(require("../models/BrandProfile"));
const router = (0, express_1.Router)();
// Get brand profile for authenticated user
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.id;
        if ((0, memoryDb_1.isDbConnected)()) {
            const profiles = await BrandProfile_1.default.find({ owner: userId });
            return res.status(200).json(profiles);
        }
        else {
            // In-memory fallback
            const profiles = memoryDb_1.memoryBrands.filter(b => b.owner === userId);
            return res.status(200).json(profiles);
        }
    }
    catch (error) {
        console.error('Error fetching brand profiles:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});
// Create or update brand profile
router.post('/', auth_1.authMiddleware, async (req, res) => {
    const { id, name, industry, targetAudience, voiceTone, goals } = req.body;
    const userId = req.user?.id;
    if (!name || !industry || !targetAudience || !voiceTone || !goals) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    try {
        if ((0, memoryDb_1.isDbConnected)()) {
            if (id) {
                const updated = await BrandProfile_1.default.findOneAndUpdate({ _id: id, owner: userId }, { name, industry, targetAudience, voiceTone, goals }, { new: true });
                if (!updated) {
                    return res.status(404).json({ message: 'Brand profile not found' });
                }
                return res.status(200).json(updated);
            }
            else {
                const newProfile = new BrandProfile_1.default({
                    name,
                    industry,
                    targetAudience,
                    voiceTone,
                    goals,
                    owner: userId
                });
                await newProfile.save();
                return res.status(201).json(newProfile);
            }
        }
        else {
            // In-memory fallback
            if (id) {
                const idx = memoryDb_1.memoryBrands.findIndex(b => b._id === id && b.owner === userId);
                if (idx === -1) {
                    return res.status(404).json({ message: 'Brand profile not found' });
                }
                memoryDb_1.memoryBrands[idx] = {
                    ...memoryDb_1.memoryBrands[idx],
                    name,
                    industry,
                    targetAudience,
                    voiceTone,
                    goals
                };
                return res.status(200).json(memoryDb_1.memoryBrands[idx]);
            }
            else {
                const mockId = 'mock_brand_' + Math.random().toString(36).substr(2, 9);
                const newProfile = {
                    _id: mockId,
                    name,
                    industry,
                    targetAudience,
                    voiceTone,
                    goals,
                    owner: userId,
                    createdAt: new Date()
                };
                memoryDb_1.memoryBrands.push(newProfile);
                return res.status(201).json(newProfile);
            }
        }
    }
    catch (error) {
        console.error('Error saving brand profile:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
