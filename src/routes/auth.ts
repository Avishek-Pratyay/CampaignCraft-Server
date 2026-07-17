import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { isDbConnected, memoryUsers } from '../config/memoryDb';
import User from '../models/User';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_campaigncraft_123!';

// Register
router.post('/register', async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    if (isDbConnected()) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      const newUser = new User({ name, email, passwordHash });
      await newUser.save();

      // Do NOT return token — user must login separately
      return res.status(201).json({
        message: 'Account created successfully! Please login with your credentials.',
        email: newUser.email
      });
    } else {
      // In-memory fallback
      const existingUser = memoryUsers.find(u => u.email === email);
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const mockId = 'mock_user_' + Math.random().toString(36).substr(2, 9);
      const newUser = { _id: mockId, name, email };
      memoryUsers.push(newUser);

      // Do NOT return token — user must login separately
      return res.status(201).json({
        message: 'Account created successfully! Please login with your credentials.',
        email
      });
    }
  } catch (error: any) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    if (isDbConnected()) {
      const user = await User.findOne({ email });
      if (!user || !user.passwordHash) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      return res.status(200).json({
        token,
        user: { id: user._id, name: user.name, email: user.email }
      });
    } else {
      // In-memory fallback login
      const user = memoryUsers.find(u => u.email === email);
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
      
      // Allow demo user bypass password check or check mock password
      if (email !== 'demo@campaigncraft.ai') {
        if (password.length < 6) {
          return res.status(400).json({ message: 'Invalid credentials' });
        }
      }

      const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      return res.status(200).json({
        token,
        user: { id: user._id, name: user.name, email: user.email }
      });
    }
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Demo login
router.post('/demo', async (req: Request, res: Response) => {
  try {
    const demoEmail = 'demo@campaigncraft.ai';
    
    if (isDbConnected()) {
      let user = await User.findOne({ email: demoEmail });

      if (!user) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash('DemoPass123!', salt);
        user = new User({
          name: 'Demo Marketer',
          email: demoEmail,
          passwordHash
        });
        await user.save();
      }

      const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      return res.status(200).json({
        token,
        user: { id: user._id, name: user.name, email: user.email }
      });
    } else {
      // In-memory fallback
      let user = memoryUsers.find(u => u.email === demoEmail);
      if (!user) {
        user = {
          _id: 'mock_demo_user_id',
          name: 'Demo Marketer',
          email: demoEmail
        };
        memoryUsers.push(user);
      }
      const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      return res.status(200).json({
        token,
        user: { id: user._id, name: user.name, email: user.email }
      });
    }
  } catch (error) {
    console.error('Demo login error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Google login simulation
router.post('/google', async (req: Request, res: Response) => {
  const { email, name, googleId } = req.body;
  if (!email || !name || !googleId) {
    return res.status(400).json({ message: 'Google auth data missing' });
  }

  try {
    if (isDbConnected()) {
      let user = await User.findOne({ email });
      if (!user) {
        user = new User({ name, email, googleId });
        await user.save();
      } else if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }

      const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      return res.status(200).json({
        token,
        user: { id: user._id, name: user.name, email: user.email }
      });
    } else {
      // In-memory fallback
      let user = memoryUsers.find(u => u.email === email);
      if (!user) {
        user = {
          _id: 'mock_google_user_' + Math.random().toString(36).substr(2, 9),
          name,
          email,
          googleId
        };
        memoryUsers.push(user);
      }
      const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      return res.status(200).json({
        token,
        user: { id: user._id, name: user.name, email: user.email }
      });
    }
  } catch (error) {
    console.error('Google login error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
