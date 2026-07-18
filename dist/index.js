"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./config/db");
const auth_1 = __importDefault(require("./routes/auth"));
const brand_1 = __importDefault(require("./routes/brand"));
const campaign_1 = __importDefault(require("./routes/campaign"));
const ai_1 = __importDefault(require("./routes/ai"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Connect to MongoDB
(0, db_1.connectDB)();
// Middleware
app.use((0, cors_1.default)({
    origin: ['https://campaign-craft-client-kappa.vercel.app', 'http://localhost:5173'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use(express_1.default.json());
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/brands', brand_1.default);
app.use('/api/campaigns', campaign_1.default);
app.use('/api/ai', ai_1.default);
// Root endpoint
app.get('/', (req, res) => {
    res.json({ message: 'CampaignCraft AI API is running.' });
});
// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
