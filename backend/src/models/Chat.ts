// models/Chat.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IChat extends Document {
  sendBy: string; // User ID who sent the message
  message: string; // Message content
  room_id: string; // Room ID where the message is sent
}

const chatSchema: Schema = new Schema({
  sendBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  room_id: { type: Schema.Types.ObjectId, ref: 'Room', required: true }
});

export default mongoose.model<IChat>('Chat', chatSchema);
