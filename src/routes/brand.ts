import { Router, Response } from 'express';
import { isDbConnected, memoryBrands } from '../config/memoryDb';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import BrandProfile from '../models/BrandProfile';

const router = Router();

// Get brand profile for authenticated user
router.get('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    
    if (isDbConnected()) {
      const profiles = await BrandProfile.find({ owner: userId });
      return res.status(200).json(profiles);
    } else {
      // In-memory fallback
      const profiles = memoryBrands.filter(b => b.owner === userId);
      return res.status(200).json(profiles);
    }
  } catch (error) {
    console.error('Error fetching brand profiles:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Create or update brand profile
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { id, name, industry, targetAudience, voiceTone, goals } = req.body;
  const userId = req.user?.id;

  if (!name || !industry || !targetAudience || !voiceTone || !goals) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    if (isDbConnected()) {
      if (id) {
        const updated = await BrandProfile.findOneAndUpdate(
          { _id: id, owner: userId },
          { name, industry, targetAudience, voiceTone, goals },
          { new: true }
        );
        if (!updated) {
          return res.status(404).json({ message: 'Brand profile not found' });
        }
        return res.status(200).json(updated);
      } else {
        const newProfile = new BrandProfile({
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
    } else {
      // In-memory fallback
      if (id) {
        const idx = memoryBrands.findIndex(b => b._id === id && b.owner === userId);
        if (idx === -1) {
          return res.status(404).json({ message: 'Brand profile not found' });
        }
        memoryBrands[idx] = {
          ...memoryBrands[idx],
          name,
          industry,
          targetAudience,
          voiceTone,
          goals
        };
        return res.status(200).json(memoryBrands[idx]);
      } else {
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
        memoryBrands.push(newProfile);
        return res.status(201).json(newProfile);
      }
    }
  } catch (error) {
    console.error('Error saving brand profile:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
