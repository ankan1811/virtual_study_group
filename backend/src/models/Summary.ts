import mongoose, { Schema, Document } from 'mongoose';

export interface ISummary extends Document {
  userId: mongoose.Types.ObjectId;
  type: 'room' | 'dm' | 'whiteboard';
  contextId: string;
  contextLabel: string;
  title: string;
  content: string;
  r2Key?: string;
  r2Url?: string;
  createdAt: Date;
  updatedAt: Date;
}

const summarySchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['room', 'dm', 'whiteboard'], required: true },
    contextId: { type: String, required: true },
    contextLabel: { type: String, default: '' },
    title: { type: String, required: true },
    content: { type: String, required: true },
    r2Key: { type: String },
    r2Url: { type: String },
  },
  { timestamps: true }
);

summarySchema.index({ userId: 1, type: 1, createdAt: -1 });

export default mongoose.model<ISummary>('Summary', summarySchema);
