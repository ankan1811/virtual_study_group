import mongoose, { Schema, Document } from 'mongoose';

export interface IDirectMessage extends Document {
  from: mongoose.Types.ObjectId;
  to: mongoose.Types.ObjectId;
  content: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const directMessageSchema: Schema = new Schema(
  {
    from: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    to: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

directMessageSchema.index({ from: 1, to: 1 });
directMessageSchema.index({ to: 1, from: 1 });
// For fast unread-count lookups
directMessageSchema.index({ to: 1, read: 1 });

export default mongoose.model<IDirectMessage>('DirectMessage', directMessageSchema);
