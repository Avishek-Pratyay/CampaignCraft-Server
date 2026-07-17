import { Router, Request, Response } from 'express';
import mongoose from 'mongoose';
import { isDbConnected, memoryCampaigns } from '../config/memoryDb';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import Campaign from '../models/Campaign';

const router = Router();

// PUBLIC: Get all campaigns (for Explore page)
router.get('/public', async (req: Request, res: Response) => {
  try {
    const { search, status, channel, sortBy, page = '1', limit = '12' } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);

    if (isDbConnected()) {
      const query: any = {};
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { shortDescription: { $regex: search, $options: 'i' } }
        ];
      }
      if (status) query.status = status;
      if (channel) query.channels = channel;

      const skipNum = (pageNum - 1) * limitNum;
      let sort: any = { createdAt: -1 };
      if (sortBy === 'budget_asc') sort = { budget: 1 };
      else if (sortBy === 'budget_desc') sort = { budget: -1 };
      else if (sortBy === 'conversions') sort = { conversions: -1 };
      else if (sortBy === 'title') sort = { title: 1 };

      const total = await Campaign.countDocuments(query);
      const campaigns = await Campaign.find(query)
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
    } else {
      // In-memory fallback
      let filtered = [...memoryCampaigns];

      if (search) {
        const s = (search as string).toLowerCase();
        filtered = filtered.filter(
          c => c.title.toLowerCase().includes(s) || c.shortDescription.toLowerCase().includes(s)
        );
      }

      if (status) {
        filtered = filtered.filter(c => c.status === status);
      }

      if (channel) {
        filtered = filtered.filter(c => c.channels.includes(channel));
      }

      // Sort
      if (sortBy === 'budget_asc') {
        filtered.sort((a, b) => a.budget - b.budget);
      } else if (sortBy === 'budget_desc') {
        filtered.sort((a, b) => b.budget - a.budget);
      } else if (sortBy === 'conversions') {
        filtered.sort((a, b) => b.conversions - a.conversions);
      } else if (sortBy === 'title') {
        filtered.sort((a, b) => a.title.localeCompare(b.title));
      } else {
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      const total = filtered.length;
      const skipNum = (pageNum - 1) * limitNum;
      const paginated = filtered.slice(skipNum, skipNum + limitNum);

      const populated = paginated.map(c => ({
        ...c,
        brandProfile: c.brandProfile === 'mock_brand_id_1' ? { name: 'Acme Apparel', industry: 'Fashion e-Commerce' } : undefined
      }));

      return res.status(200).json({
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        campaigns: populated
      });
    }
  } catch (error) {
    console.error('Error fetching public campaigns:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PUBLIC: Get campaign details by ID
router.get('/public/:id', async (req: Request, res: Response) => {
  try {
    const idParam = req.params.id;
    
    if (isDbConnected() && mongoose.Types.ObjectId.isValid(idParam)) {
      const campaign = await Campaign.findById(idParam).populate('brandProfile');
      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }

      const related = await Campaign.find({
        _id: { $ne: campaign._id },
        $or: [
          { status: campaign.status },
          { channels: { $in: campaign.channels } }
        ]
      }).limit(3);

      return res.status(200).json({ campaign, related });
    } else {
      // In-memory fallback
      const campaign = memoryCampaigns.find(c => c._id === idParam);
      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found' });
      }

      const populatedCampaign = {
        ...campaign,
        brandProfile: campaign.brandProfile === 'mock_brand_id_1' ? {
          name: 'Acme Apparel',
          industry: 'Fashion e-Commerce',
          targetAudience: 'Young adults age 18-35',
          voiceTone: 'Witty & Bold',
          goals: 'Increase winter coat conversions'
        } : undefined
      };

      const related = memoryCampaigns
        .filter(c => c._id !== campaign._id)
        .slice(0, 3);

      return res.status(200).json({ campaign: populatedCampaign, related });
    }
  } catch (error) {
    console.error('Error fetching campaign details:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PROTECTED: Get authenticated user's campaigns
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (isDbConnected()) {
      const campaigns = await Campaign.find({ owner: userId }).populate('brandProfile');
      return res.status(200).json(campaigns);
    } else {
      const campaigns = memoryCampaigns
        .filter(c => c.owner === userId)
        .map(c => ({
          ...c,
          brandProfile: c.brandProfile === 'mock_brand_id_1' ? { name: 'Acme Apparel', industry: 'Fashion e-Commerce' } : undefined
        }));
      return res.status(200).json(campaigns);
    }
  } catch (error) {
    console.error('Error fetching user campaigns:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PROTECTED: Create campaign
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { title, shortDescription, fullDescription, budget, channels, launchDate, status, brandProfileId } = req.body;
  const userId = req.user?.id;

  if (!title || !shortDescription || !fullDescription || !budget) {
    return res.status(400).json({ message: 'Missing required campaign fields' });
  }

  try {
    const impressions = Math.floor(Math.random() * 50000) + 10000;
    const clicks = Math.floor(impressions * (Math.random() * 0.05 + 0.01));
    const ctr = parseFloat(((clicks / impressions) * 100).toFixed(2));
    const conversions = Math.floor(clicks * (Math.random() * 0.15 + 0.02));
    const cpc = parseFloat((Math.random() * 1.5 + 0.2).toFixed(2));

    if (isDbConnected() && (!brandProfileId || mongoose.Types.ObjectId.isValid(brandProfileId))) {
      const newCampaign = new Campaign({
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
    } else {
      // In-memory fallback
      const mockId = 'mock_camp_' + Math.random().toString(36).substr(2, 9);
      const newCampaign = {
        _id: mockId,
        title,
        shortDescription,
        fullDescription,
        budget: Number(budget),
        channels: Array.isArray(channels) ? channels : [channels],
        launchDate: launchDate ? new Date(launchDate) : new Date(),
        status: status || 'Planning',
        impressions,
        clicks,
        ctr,
        conversions,
        cpc,
        brandProfile: brandProfileId || undefined,
        owner: userId,
        createdAt: new Date()
      };

      memoryCampaigns.push(newCampaign);
      return res.status(201).json(newCampaign);
    }
  } catch (error) {
    console.error('Error creating campaign:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// PROTECTED: Delete campaign
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const idParam = req.params.id;
  
  try {
    if (isDbConnected() && mongoose.Types.ObjectId.isValid(idParam)) {
      const campaign = await Campaign.findOneAndDelete({ _id: idParam, owner: userId });
      if (!campaign) {
        return res.status(404).json({ message: 'Campaign not found or unauthorized' });
      }
      return res.status(200).json({ message: 'Campaign deleted successfully' });
    } else {
      // In-memory fallback
      const idx = memoryCampaigns.findIndex(c => c._id === idParam && c.owner === userId);
      if (idx === -1) {
        return res.status(404).json({ message: 'Campaign not found or unauthorized' });
      }
      memoryCampaigns.splice(idx, 1);
      return res.status(200).json({ message: 'Campaign deleted successfully' });
    }
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
