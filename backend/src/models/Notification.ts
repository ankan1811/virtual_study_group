import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType = 'companion_request' | 'companion_accepted' | 'room_invite';

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  type: NotificationType;
  fromUserId: string;
  fromUserName: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['companion_request', 'companion_accepted', 'room_invite'],
      required: true,
    },
    fromUserId: { type: String, required: true },
    fromUserName: { type: String, required: true },
    data: { type: Schema.Types.Mixed },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Auto-delete after 10 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 864000 });

export default mongoose.model<INotification>('Notification', notificationSchema);
