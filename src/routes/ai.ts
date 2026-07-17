import { Router, Response } from 'express';
import multer from 'multer';
import { Readable } from 'stream';
import csv from 'csv-parser';
import mongoose from 'mongoose';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { isDbConnected, memoryBrands, memoryCampaigns } from '../config/memoryDb';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import BrandProfile from '../models/BrandProfile';
import Campaign from '../models/Campaign';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Helper to parse CSV buffer
const parseCSV = (buffer: Buffer): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    const stream = Readable.from(buffer);
    stream
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
};

// Initialize Gemini API client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
};

// 1. AI Content Generator
router.post('/generate-copy', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { brandProfileId, template, length, additionalInstructions } = req.body;

  let brandContext = "General Brand";
  let voiceTone = "professional and engaging";
  let industry = "digital marketing";
  let audience = "general public";
  let goals = "increase awareness";

  try {
    if (brandProfileId) {
      let profile = null;
      if (isDbConnected() && mongoose.Types.ObjectId.isValid(brandProfileId)) {
        profile = await BrandProfile.findById(brandProfileId);
      } else {
        profile = memoryBrands.find(b => b._id === brandProfileId);
      }

      if (profile) {
        brandContext = `Brand Name: ${profile.name}\nIndustry: ${profile.industry}\nTarget Audience: ${profile.targetAudience}\nBrand Goals: ${profile.goals}`;
        voiceTone = profile.voiceTone;
        industry = profile.industry;
        audience = profile.targetAudience;
        goals = profile.goals;
      }
    }

    const lengthWordCount = length === 'short' ? 'around 50 words' : length === 'medium' ? 'around 150 words' : 'around 300 words';

    const prompt = `You are an expert AI Marketing Copywriter. 
Generate a high-converting ${template} campaign copy.
Brand Information:
${brandContext}
Voice and Tone: ${voiceTone}
Length requirement: ${lengthWordCount}.

Additional Guidelines: ${additionalInstructions || 'None'}

Please format the response nicely with a Headline, Body Copy, and call-to-action (CTA). No meta-commentary, just the content.`;

    const gemini = getGeminiClient();
    if (gemini) {
      try {
        const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return res.status(200).json({ text: response.text() });
      } catch (err: any) {
        console.error('Gemini call failed, using high-quality mock copy:', err.message);
      }
    }

    const mockCopy = generateMockMarketingCopy(template, voiceTone, industry, audience, goals, length);
    return res.status(200).json({ text: mockCopy });

  } catch (error) {
    console.error('Copywriter generator error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// 2. AI Data Analyzer
router.post('/analyze-data', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a CSV or JSON file.' });
    }

    let rawData: any[] = [];
    const fileContent = req.file.buffer.toString('utf-8');

    if (req.file.originalname.endsWith('.csv')) {
      rawData = await parseCSV(req.file.buffer);
    } else if (req.file.originalname.endsWith('.json')) {
      rawData = JSON.parse(fileContent);
    } else {
      return res.status(400).json({ message: 'Unsupported file format. Upload .csv or .json.' });
    }

    if (rawData.length === 0) {
      return res.status(400).json({ message: 'File is empty.' });
    }

    let totalSpend = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalConversions = 0;

    const parsedRows = rawData.map(row => {
      const spend = parseFloat(row.spend || row.Spend || row.cost || row.Cost || '0');
      const imps = parseInt(row.impressions || row.Impressions || row.imps || '0', 10);
      const clicks = parseInt(row.clicks || row.Clicks || '0', 10);
      const convs = parseInt(row.conversions || row.Conversions || row.conv || '0', 10);
      const date = row.date || row.Date || row.day || 'N/A';
      const channel = row.channel || row.Channel || row.platform || 'N/A';

      totalSpend += spend;
      totalImpressions += imps;
      totalClicks += clicks;
      totalConversions += convs;

      return { date, channel, spend, imps, clicks, convs };
    });

    const overallCTR = totalImpressions > 0 ? parseFloat(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;
    const overallCPC = totalClicks > 0 ? parseFloat((totalSpend / totalClicks).toFixed(2)) : 0;
    const conversionRate = totalClicks > 0 ? parseFloat(((totalConversions / totalClicks) * 100).toFixed(2)) : 0;

    const dataStats = {
      totalSpend: parseFloat(totalSpend.toFixed(2)),
      totalImpressions,
      totalClicks,
      totalConversions,
      overallCTR,
      overallCPC,
      conversionRate
    };

    const prompt = `You are a Senior Agentic Marketing Data Analyst. 
Analyze the following marketing campaign analytics data:
Data Stats Summary:
- Total Ad Spend: $${dataStats.totalSpend}
- Total Impressions: ${dataStats.totalImpressions}
- Total Clicks: ${dataStats.totalClicks}
- Overall CTR: ${dataStats.overallCTR}%
- Average Cost Per Click (CPC): $${dataStats.overallCPC}
- Total Conversions: ${dataStats.totalConversions}
- Conversion Rate: ${dataStats.conversionRate}%

Detailed rows uploaded:
${JSON.stringify(parsedRows.slice(0, 15), null, 2)}
(Truncated showing first 15 rows)

Write an actionable marketing audit. Provide:
1. Executive Summary & KPIs
2. Key Performance Trends
3. Budget Optimization & Re-allocation Recommendations
4. Channel Efficiency breakdown
5. Low-performing anomalies/warnings to address.

Please format your response in professional Markdown.`;

    const gemini = getGeminiClient();
    let analysisMarkdown = '';

    if (gemini) {
      try {
        const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        analysisMarkdown = response.text();
      } catch (err: any) {
        console.error('Gemini data analysis failed, using fallback:', err.message);
      }
    }

    if (!analysisMarkdown) {
      analysisMarkdown = generateMockDataAnalysis(dataStats, parsedRows);
    }

    return res.status(200).json({
      summary: dataStats,
      chartData: parsedRows,
      analysis: analysisMarkdown
    });

  } catch (error: any) {
    console.error('Data analyzer endpoint error:', error);
    return res.status(500).json({ message: 'Error parsing data file: ' + error.message });
  }
});

// 3. AI Smart Recommendation Engine
router.post('/recommendations', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { campaignId } = req.body;
  if (!campaignId) {
    return res.status(400).json({ message: 'Campaign ID is required' });
  }

  try {
    let campaign = null;
    
    if (isDbConnected() && mongoose.Types.ObjectId.isValid(campaignId)) {
      campaign = await Campaign.findById(campaignId).populate('brandProfile');
    } else {
      campaign = memoryCampaigns.find(c => c._id === campaignId);
      if (campaign && campaign.brandProfile === 'mock_brand_id_1') {
        campaign = {
          ...campaign,
          brandProfile: memoryBrands.find(b => b._id === 'mock_brand_id_1')
        };
      }
    }

    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }

    const brand = campaign.brandProfile;
    const prompt = `You are a Smart Agentic Optimization Advisor.
Analyze this campaign's details and KPI statistics:
- Title: ${campaign.title}
- Description: ${campaign.shortDescription}
- Budget: $${campaign.budget}
- Target Channels: ${campaign.channels.join(', ')}
- Impressions: ${campaign.impressions}
- Clicks: ${campaign.clicks}
- Conversions: ${campaign.conversions}
- CPC: $${campaign.cpc}
- CTR: ${campaign.ctr}%
${brand ? `- Brand Industry: ${(brand as any).industry}\n- Brand Target Audience: ${(brand as any).targetAudience}` : ''}

Generate 4 strategic recommendations for this campaign, each having:
- Title (max 6 words)
- Impact (High / Medium / Low)
- Description (actionable marketing advice, max 2 sentences)
- Recommended Action (concrete step, max 10 words)

Format the response strictly as a JSON array of 4 items with fields: "title", "impact", "description", "action".
Response:`;

    const gemini = getGeminiClient();
    if (gemini) {
      try {
        const model = gemini.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text().trim();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.status(200).json(parsed);
        }
      } catch (err: any) {
        console.error('Gemini recommendation call failed, using mock recommendations:', err.message);
      }
    }

    const mockRecommendations = [
      {
        title: "Optimize Ad Bid Caps",
        impact: "High",
        description: `Your average CPC is currently at $${campaign.cpc}. Implementing automated bidding targets or bid caps on channels like ${campaign.channels[0] || 'Meta'} can decrease spend while preserving clicks.`,
        action: "Set CPC cap to 15% below current average."
      },
      {
        title: "Retarget High CTR Channels",
        impact: "High",
        description: `With a CTR of ${campaign.ctr}%, your creative copy resonates but conversions need support. Shift 20% budget to custom retargeting lists.`,
        action: "Set up Facebook Custom Audience pixels."
      },
      {
        title: "A/B Test Copy Length",
        impact: "Medium",
        description: "Long-form descriptions might be fatiguing mobile audiences. Try creating sub-variant ads with punchy 1-sentence hooks.",
        action: "Launch 2 short-copy ad variants."
      },
      {
        title: "Incorporate Social Proof",
        impact: "Medium",
        description: "Boost trust factors by injecting testimonial highlights directly in ad headers to increase conversions.",
        action: "Add 1 product review tag to banner ads."
      }
    ];

    return res.status(200).json(mockRecommendations);

  } catch (error) {
    console.error('Recommendations error:', error);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Helper Mock Copywriter
function generateMockMarketingCopy(
  template: string,
  tone: string,
  industry: string,
  audience: string,
  goals: string,
  length: string
): string {
  if (template === 'Social Media Post') {
    return `🚀 Ready to scale your brand? 🚀

If you are a part of the target audience (${audience}), you know how critical it is to achieve goals like "${goals}". That's where we come in.

We deliver state-of-the-art results customized for the ${industry} industry. Dynamic, elegant, and designed with a ${tone} approach to help your brand shine!

💡 Key Takeaway: Don't settle for baseline metrics. Make your campaign craft work for you!
🔗 Click the link in bio to learn more and try CampaignCraft AI today. 

#${industry.replace(/\s+/g, '')} #MarketingAgency #GrowthHacking #AIPower`;
  }

  if (template === 'Email Newsletter') {
    return `Subject: Transform your ${industry} strategies today 📈

Hi there,

We know how challenging it can be to target "${audience}" effectively. Between rising CPC rates and changing algorithms, maintaining steady growth is a constant battle.

That is why we are introducing a new approach to ${goals}. Written with a ${tone} perspective, our latest frameworks are built specifically to scale:
• Maximized Conversions: Reduce click leakage by utilizing custom profiles.
• Dynamic Brand Strategy: Ground your assets directly in your voice tone.
• Automated Recommendations: Never guess your next budget shift.

"CampaignCraft AI changed how we approach our quarterly budgets. Highly recommended." — Growth Lead

Ready to get started? We've prepared a comprehensive brand analysis tool just for you.

Best regards,
The CampaignCraft Team`;
  }

  return `### Headline: The Future of ${industry} in the Age of Agentic AI

In today's digital landscape, targeting ${audience} requires more than simple static templates. Brands must adapt their voice to be both ${tone} and outcome-oriented.

#### Core Insights:
1. **Understanding Target Audiences**: Audience behaviors shift weekly. AI personalization allows brands to address customer pain points in real time.
2. **Automating Strategy**: The role of a marketer is pivoting from manual configuration to strategic oversight. Smart algorithms handle the CPC bids, while you focus on creative direction.
3. **Data-Driven Execution**: Up-to-date campaign logs show that brands using dynamic strategies enjoy up to a 24% reduction in overall cost-per-acquisition.

#### Action Plan:
Define a clear brand tone, monitor your performance metrics closely, and shift budget allocations to channels that exhibit steady conversion rates. Try CampaignCraft AI today to automate these processes seamlessly.`;
}

// Helper Mock Data Analysis Report
function generateMockDataAnalysis(stats: any, rows: any[]): string {
  return `# Marketing Campaign Audit Report

## 1. Executive Summary & KPIs
The campaign dataset contains **${rows.length} records** tracking performance. Here is a summary of the key performance indicators:
- **Total Ad Spend**: \`$${stats.totalSpend}\`
- **Total Impressions**: \`${stats.totalImpressions.toLocaleString()}\`
- **Total Clicks**: \`${stats.totalClicks.toLocaleString()}\`
- **Overall Click-Through Rate (CTR)**: \`${stats.overallCTR}%\`
- **Average Cost Per Click (CPC)**: \`$${stats.overallCPC}\`
- **Total Conversions**: \`${stats.totalConversions.toLocaleString()}\`
- **Average Conversion Rate**: \`${stats.conversionRate}%\`

## 2. Key Performance Trends
- **Audience Engagement**: The overall CTR is sitting at \`${stats.overallCTR}%\`. Values exceeding 2.0% indicate strong ad creative alignment, while values below 1.0% indicate a need to redesign the banners or refine target demographics.
- **Traffic Volume**: The campaigns drove a total of \`${stats.totalClicks.toLocaleString()}\` clicks. There is a healthy traffic stream, but focus must shift towards increasing the conversion rate, which currently sits at \`${stats.conversionRate}%\`.

## 3. Channel Efficiency & CPC Breakdown
Based on standard data aggregates:
- **CPC Efficiency**: The average cost of \`$${stats.overallCPC}\` per click indicates stable performance. However, if LinkedIn or Search channels represent the bulk of this CPC, budget should be shifted towards lower-cost networks (e.g. Meta Ads or Twitter Ads) to maximize traffic volume.
- **Lead Generation**: With \`${stats.totalConversions}\` total conversions, the cost-per-conversion is approximately \`$${(stats.totalSpend / (stats.totalConversions || 1)).toFixed(2)}\`.

## 4. Strategic Recommendations
1. **Optimize Low-Performing Days**: Pause campaigns during low-traffic days (traditionally weekends) to reduce wasted budget.
2. **Increase Retargeting Budget**: Allocate 15-20% of the budget to remarketing ads to nurture users who clicked but did not convert.
3. **Dynamic Bid Adjustments**: Set maximum bid targets on channels where the CPC exceeds $1.50 to avoid budget exhaustion.

---
*Report generated automatically by CampaignCraft Data Intelligence Agent.*`;
}

export default router;
