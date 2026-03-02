import mongoose, { Schema, Document } from 'mongoose';

export interface IDirectMessage extends Document {
  from: mongoose.Types.ObjectId;
  to: mongoose.Types.ObjectId;
  content: string;
  createdAt: Date;
}

const directMessageSchema: Schema = new Schema(
  {
    from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

directMessageSchema.index({ from: 1, to: 1 });
directMessageSchema.index({ to: 1, from: 1 });

export default mongoose.model<IDirectMessage>('DirectMessage', directMessageSchema);
