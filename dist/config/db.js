"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/campaigncraft';
    try {
        await mongoose_1.default.connect(mongoURI);
        console.log('MongoDB connected successfully.');
    }
    catch (error) {
        console.error('MongoDB connection error:', error);
        console.log('Ensure MongoDB is running locally, or update MONGODB_URI in the backend .env file.');
    }
};
exports.connectDB = connectDB;
