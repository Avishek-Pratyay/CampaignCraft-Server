import { Schema, model, Document, Types } from 'mongoose';

export interface ICampaign extends Document {
  title: string;
  shortDescription: string;
  fullDescription: string;
  budget: number;
  channels: string[];
  launchDate: Date;
  status: 'Planning' | 'Active' | 'Paused' | 'Completed';
  cpc: number;
  conversions: number;
  ctr: number;
  impressions: number;
  clicks: number;
  brandProfile?: Types.ObjectId;
  owner: Types.ObjectId;
  createdAt: Date;
}

const campaignSchema = new Schema<ICampaign>({
  title: { type: String, required: true },
  shortDescription: { type: String, required: true },
  fullDescription: { type: String, required: true },
  budget: { type: Number, required: true },
  channels: { type: [String], default: [] },
  launchDate: { type: Date, required: true, default: Date.now },
  status: { 
    type: String, 
    enum: ['Planning', 'Active', 'Paused', 'Completed'], 
    default: 'Planning' 
  },
  cpc: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
  ctr: { type: Number, default: 0 },
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
  brandProfile: { type: Schema.Types.ObjectId, ref: 'BrandProfile' },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

export default model<ICampaign>('Campaign', campaignSchema);
