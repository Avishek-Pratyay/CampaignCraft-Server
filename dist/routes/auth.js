"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
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
        const existingUser = await User_1.default.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const passwordHash = await bcryptjs_1.default.hash(password, salt);
        const newUser = new User_1.default({ name, email, passwordHash });
        await newUser.save();
        const token = jsonwebtoken_1.default.sign({ id: newUser._id, email: newUser.email }, JWT_SECRET, { expiresIn: '7d' });
        return res.status(201).json({
            token,
            user: { id: newUser._id, name: newUser.name, email: newUser.email }
        });
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
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});
// Demo login (autofills credentials and signs in)
router.post('/demo', async (req, res) => {
    try {
        const demoEmail = 'demo@campaigncraft.ai';
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
    catch (error) {
        console.error('Google login error:', error);
        return res.status(500).json({ message: 'Server error' });
    }
});
exports.default = router;
