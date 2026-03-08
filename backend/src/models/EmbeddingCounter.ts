import mongoose, { Schema, Document } from 'mongoose';

export interface IEmbeddingCounter extends Document {
  dateKey: string; // "2026-03-08"
  count: number;
}

const embeddingCounterSchema: Schema = new Schema({
  dateKey: { type: String, required: true },
  count: { type: Number, default: 0 },
});

embeddingCounterSchema.index({ dateKey: 1 }, { unique: true });

export default mongoose.model<IEmbeddingCounter>('EmbeddingCounter', embeddingCounterSchema);
