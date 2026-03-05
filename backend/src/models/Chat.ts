import mongoose, { Schema, Document } from 'mongoose';

export interface IChat extends Document {
  sendBy: mongoose.Types.ObjectId;
  senderName: string;
  message: string;
  room_id: string;
  sessionId: string;
}

const chatSchema: Schema = new Schema({
  sendBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: { type: String, required: true },
  message: { type: String, required: true },
  room_id: { type: String, required: true },
  sessionId: { type: String, required: true },
}, { timestamps: true });

chatSchema.index({ room_id: 1, createdAt: 1 });

export default mongoose.model<IChat>('Chat', chatSchema);
