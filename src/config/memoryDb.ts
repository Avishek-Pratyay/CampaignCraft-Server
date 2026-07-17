import mongoose from 'mongoose';

// Helper to check if MongoDB connection is open
export const isDbConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};

// Shared fallback databases for offline operation
export const memoryUsers: any[] = [
  {
    _id: 'mock_demo_user_id',
    name: 'Demo Marketer',
    email: 'demo@campaigncraft.ai',
    passwordHash: '$2a$10$xyzDemoHashedPasswordPlaceholderKey'
  }
];

export const memoryBrands: any[] = [
  {
    _id: 'mock_brand_id_1',
    name: 'Acme Apparel',
    industry: 'Fashion e-Commerce',
    targetAudience: 'Young adults age 18-35',
    voiceTone: 'Witty & Bold',
    goals: 'Increase winter coat conversions',
    owner: 'mock_demo_user_id',
    createdAt: new Date()
  }
];

export const memoryCampaigns: any[] = [
  {
    _id: 'mock_camp_1',
    title: 'Acme Winter Jacket Launch',
    shortDescription: 'Driving conversions for heavy winter jackets and coats with targeted search ads.',
    fullDescription: 'This campaign targets regions experiencing sub-zero temperatures. We run search copy variant ads promoting our premium insulated coats, winter wear, and thermal gloves. Key KPIs include driving conversions under a CPC cap of $0.80 and maintaining Click-Through Rates above 2.2% across search channels.',
    budget: 12000,
    channels: ['Google Ads', 'Meta Ads'],
    launchDate: new Date('2026-11-15'),
    status: 'Active',
    impressions: 48500,
    clicks: 2950,
    ctr: 6.08,
    conversions: 340,
    cpc: 0.58,
    brandProfile: 'mock_brand_id_1',
    owner: 'mock_demo_user_id',
    createdAt: new Date('2026-11-10')
  },
  {
    _id: 'mock_camp_2',
    title: 'Spring Apparel Social Blast',
    shortDescription: 'Boosting brand awareness and sales for the new Spring collection on social platforms.',
    fullDescription: 'We are introducing our pastel fashion lines, light hoodies, and premium sustainable denim. Creative assets emphasize eco-friendly materials and casual spring styles. We run ad placements on Meta, Twitter, and TikTok, optimizing for high engagement and video completions.',
    budget: 8500,
    channels: ['Meta Ads', 'Twitter', 'Email'],
    launchDate: new Date('2026-03-01'),
    status: 'Completed',
    impressions: 92400,
    clicks: 5840,
    ctr: 6.32,
    conversions: 890,
    cpc: 0.42,
    brandProfile: 'mock_brand_id_1',
    owner: 'mock_demo_user_id',
    createdAt: new Date('2026-02-25')
  },
  {
    _id: 'mock_camp_3',
    title: 'Acme Dev Tooling Ad Group',
    shortDescription: 'Targeting enterprise tech leads for Acme SaaS developer console.',
    fullDescription: 'Corporate B2B outreach campaign designed to acquire development team accounts. We focus on LinkedIn sponsored updates highlighting Kubernetes automated configurations and container metrics logs pipelines. Bid caps are set high due to sector competition, with target CPC at $1.80.',
    budget: 20000,
    channels: ['LinkedIn', 'Google Ads'],
    launchDate: new Date('2026-08-01'),
    status: 'Planning',
    impressions: 0,
    clicks: 0,
    ctr: 0,
    conversions: 0,
    cpc: 0,
    brandProfile: 'mock_brand_id_1',
    owner: 'mock_demo_user_id',
    createdAt: new Date()
  },
  {
    _id: 'mock_camp_4',
    title: 'Summer Accessories Retargeting',
    shortDescription: 'Remarketing campaigns targeting cart abandoners with custom discounts.',
    fullDescription: 'Retargeting campaign aimed at users who added sunglasses, beach bags, or light scarves to their cart but left before checkout. Ad creatives feature an extra 10% coupon code (SUMMER10) to secure completions. Monitored closely for return on ad spend (ROAS).',
    budget: 6500,
    channels: ['Meta Ads', 'Google Ads', 'Email'],
    launchDate: new Date('2026-06-15'),
    status: 'Active',
    impressions: 22000,
    clicks: 1420,
    ctr: 6.45,
    conversions: 185,
    cpc: 0.35,
    brandProfile: 'mock_brand_id_1',
    owner: 'mock_demo_user_id',
    createdAt: new Date('2026-06-10')
  }
];
