import { Schema, model, Document, Types } from 'mongoose';

export interface IBrandProfile extends Document {
  name: string;
  industry: string;
  targetAudience: string;
  voiceTone: string;
  goals: string;
  owner: Types.ObjectId;
  createdAt: Date;
}

const brandProfileSchema = new Schema<IBrandProfile>({
  name: { type: String, required: true },
  industry: { type: String, required: true },
  targetAudience: { type: String, required: true },
  voiceTone: { type: String, required: true },
  goals: { type: String, required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
});

export default model<IBrandProfile>('BrandProfile', brandProfileSchema);
