import mongoose, { Schema, Document } from 'mongoose';

export interface IWhiteboardState extends Document {
  roomId: string;
  elements: any[];
  createdAt: Date;
  updatedAt: Date;
}

const whiteboardStateSchema = new Schema(
  {
    roomId: { type: String, required: true, unique: true },
    elements: { type: Schema.Types.Mixed, default: [] },
  },
  { timestamps: true }
);

export default mongoose.model<IWhiteboardState>('WhiteboardState', whiteboardStateSchema);
