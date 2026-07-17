"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const Campaign_1 = __importDefault(require("../models/Campaign"));
const router = (0, express_1.Router)();
// PUBLIC: Get all campaigns (for Explore page)
router.get('/public', async (req, res) => {
    try {
        const { search, status, channel, sortBy, page = '1', limit = '12' } = req.query;
        const query = {};
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { shortDescription: { $regex: search, $options: 'i' } }
            ];
        }
        if (status) {
            query.status = status;
        }
        if (channel) {
            query.channels = channel;
        }
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);
        const skipNum = (pageNum - 1) * limitNum;
        let sort = { createdAt: -1 };
        if (sortBy === 'budget_asc')
            sort = { budget: 1 };
        else if (sortBy === 'budget_desc')
            sort = { budget: -1 };
        else if (sortBy === 'conversions')
            sort = { conversions: -1 };
        else if (sortBy === 'title')
            sort = { title: 1 };
        const total = await Campaign_1.default.countDocuments(query);
        const campaigns = await Campaign_1.default.find(query)
            .populate('brandProfile', 'name industry')
            .sort(sort)
            .skip(skipNum)
            .limit(limitNum);
        return res.status(200).json({
            total,
            page: pageNum,
            totalPages: Math.ceil(total / limitNum),
            campaigns
        });
    }
    catch (error) {
        console.error('Error fetching public campaigns:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});
// PUBLIC: Get campaign details by ID
router.get('/public/:id', async (req, res) => {
    try {
        const campaign = await Campaign_1.default.findById(req.params.id).populate('brandProfile');
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found' });
        }
        // Generate related campaigns
        const related = await Campaign_1.default.find({
            _id: { $ne: campaign._id },
            $or: [
                { status: campaign.status },
                { channels: { $in: campaign.channels } }
            ]
        }).limit(3);
        return res.status(200).json({ campaign, related });
    }
    catch (error) {
        console.error('Error fetching campaign details:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});
// PROTECTED: Get authenticated user's campaigns
router.get('/', auth_1.authMiddleware, async (req, res) => {
    try {
        const userId = req.user?.id;
        const campaigns = await Campaign_1.default.find({ owner: userId }).populate('brandProfile');
        return res.status(200).json(campaigns);
    }
    catch (error) {
        console.error('Error fetching user campaigns:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});
// PROTECTED: Create campaign
router.post('/', auth_1.authMiddleware, async (req, res) => {
    const { title, shortDescription, fullDescription, budget, channels, launchDate, status, brandProfileId } = req.body;
    const userId = req.user?.id;
    if (!title || !shortDescription || !fullDescription || !budget) {
        return res.status(400).json({ message: 'Missing required campaign fields' });
    }
    try {
        // Generate some mock initial analytics for visual charts
        const impressions = Math.floor(Math.random() * 50000) + 10000;
        const clicks = Math.floor(impressions * (Math.random() * 0.05 + 0.01)); // 1% to 6% CTR
        const ctr = parseFloat(((clicks / impressions) * 100).toFixed(2));
        const conversions = Math.floor(clicks * (Math.random() * 0.15 + 0.02)); // 2% to 17% CR
        const cpc = parseFloat((Math.random() * 1.5 + 0.2).toFixed(2));
        const newCampaign = new Campaign_1.default({
            title,
            shortDescription,
            fullDescription,
            budget,
            channels: Array.isArray(channels) ? channels : [channels],
            launchDate: launchDate ? new Date(launchDate) : new Date(),
            status: status || 'Planning',
            impressions,
            clicks,
            ctr,
            conversions,
            cpc,
            brandProfile: brandProfileId || undefined,
            owner: userId
        });
        await newCampaign.save();
        return res.status(201).json(newCampaign);
    }
    catch (error) {
        console.error('Error creating campaign:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});
// PROTECTED: Delete campaign
router.delete('/:id', auth_1.authMiddleware, async (req, res) => {
    const userId = req.user?.id;
    try {
        const campaign = await Campaign_1.default.findOneAndDelete({ _id: req.params.id, owner: userId });
        if (!campaign) {
            return res.status(404).json({ message: 'Campaign not found or unauthorized' });
        }
        return res.status(200).json({ message: 'Campaign deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting campaign:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
