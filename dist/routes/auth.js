"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const memoryDb_1 = require("../config/memoryDb");
const User_1 = __importDefault(require("../models/User"));
const router = (0, express_1.Router)();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_campaigncraft_123!';
// Register
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    try {
        if ((0, memoryDb_1.isDbConnected)()) {
            const existingUser = await User_1.default.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'User already exists' });
            }
            const salt = await bcryptjs_1.default.genSalt(10);
            const passwordHash = await bcryptjs_1.default.hash(password, salt);
            const newUser = new User_1.default({ name, email, passwordHash });
            await newUser.save();
            // Do NOT return token — user must login separately
            return res.status(201).json({
                message: 'Account created successfully! Please login with your credentials.',
                email: newUser.email
            });
        }
        else {
            // In-memory fallback
            const existingUser = memoryDb_1.memoryUsers.find(u => u.email === email);
            if (existingUser) {
                return res.status(400).json({ message: 'User already exists' });
            }
            const mockId = 'mock_user_' + Math.random().toString(36).substr(2, 9);
            const newUser = { _id: mockId, name, email };
            memoryDb_1.memoryUsers.push(newUser);
            // Do NOT return token — user must login separately
            return res.status(201).json({
                message: 'Account created successfully! Please login with your credentials.',
                email
            });
        }
    }
    catch (error) {
        console.error('Register error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});
// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    try {
        if ((0, memoryDb_1.isDbConnected)()) {
            const user = await User_1.default.findOne({ email });
            if (!user || !user.passwordHash) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }
            const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
            if (!isMatch) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }
            const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
            return res.status(200).json({
                token,
                user: { id: user._id, name: user.name, email: user.email }
            });
        }
        else {
            // In-memory fallback login
            const user = memoryDb_1.memoryUsers.find(u => u.email === email);
            if (!user) {
                return res.status(400).json({ message: 'Invalid credentials' });
            }
            // Allow demo user bypass password check or check mock password
            if (email !== 'demo@campaigncraft.ai') {
                if (password.length < 6) {
                    return res.status(400).json({ message: 'Invalid credentials' });
                }
            }
            const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
            return res.status(200).json({
                token,
                user: { id: user._id, name: user.name, email: user.email }
            });
        }
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});
// Demo login
router.post('/demo', async (req, res) => {
    try {
        const demoEmail = 'demo@campaigncraft.ai';
        if ((0, memoryDb_1.isDbConnected)()) {
            let user = await User_1.default.findOne({ email: demoEmail });
            if (!user) {
                const salt = await bcryptjs_1.default.genSalt(10);
                const passwordHash = await bcryptjs_1.default.hash('DemoPass123!', salt);
                user = new User_1.default({
                    name: 'Demo Marketer',
                    email: demoEmail,
                    passwordHash
                });
                await user.save();
            }
            const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
            return res.status(200).json({
                token,
                user: { id: user._id, name: user.name, email: user.email }
            });
        }
        else {
            // In-memory fallback
            let user = memoryDb_1.memoryUsers.find(u => u.email === demoEmail);
            if (!user) {
                user = {
                    _id: 'mock_demo_user_id',
                    name: 'Demo Marketer',
                    email: demoEmail
                };
                memoryDb_1.memoryUsers.push(user);
            }
            const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
            return res.status(200).json({
                token,
                user: { id: user._id, name: user.name, email: user.email }
            });
        }
    }
    catch (error) {
        console.error('Demo login error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});
// Google login simulation
router.post('/google', async (req, res) => {
    const { email, name, googleId } = req.body;
    if (!email || !name || !googleId) {
        return res.status(400).json({ message: 'Google auth data missing' });
    }
    try {
        if ((0, memoryDb_1.isDbConnected)()) {
            let user = await User_1.default.findOne({ email });
            if (!user) {
                user = new User_1.default({ name, email, googleId });
                await user.save();
            }
            else if (!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }
            const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
            return res.status(200).json({
                token,
                user: { id: user._id, name: user.name, email: user.email }
            });
        }
        else {
            // In-memory fallback
            let user = memoryDb_1.memoryUsers.find(u => u.email === email);
            if (!user) {
                user = {
                    _id: 'mock_google_user_' + Math.random().toString(36).substr(2, 9),
                    name,
                    email,
                    googleId
                };
                memoryDb_1.memoryUsers.push(user);
            }
            const token = jsonwebtoken_1.default.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
            return res.status(200).json({
                token,
                user: { id: user._id, name: user.name, email: user.email }
            });
        }
    }
    catch (error) {
        console.error('Google login error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
