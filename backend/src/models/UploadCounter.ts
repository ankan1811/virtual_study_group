import mongoose, { Schema, Document } from 'mongoose';

export interface IUploadCounter extends Document {
  userId: string;
  monthKey: string; // "2026-03"
  count: number;
}

const uploadCounterSchema: Schema = new Schema({
  userId: { type: String, required: true },
  monthKey: { type: String, required: true },
  count: { type: Number, default: 0 },
});

uploadCounterSchema.index({ userId: 1, monthKey: 1 }, { unique: true });

export default mongoose.model<IUploadCounter>('UploadCounter', uploadCounterSchema);
