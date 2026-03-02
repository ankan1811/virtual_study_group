import mongoose, { Schema, Document } from 'mongoose';

export interface ICompanion extends Document {
  requester: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  status: 'pending' | 'accepted';
}

const companionSchema: Schema = new Schema(
  {
    requester: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
  },
  { timestamps: true }
);

companionSchema.index({ requester: 1, recipient: 1 }, { unique: true });

export default mongoose.model<ICompanion>('Companion', companionSchema);
