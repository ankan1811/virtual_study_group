// models/User.ts

import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  bio: string;
  avatar: string;
}

const userSchema: Schema = new Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  bio: { type: String, default: '' },
  avatar: { type: String, default: '' },
});

export default mongoose.model<IUser>('User', userSchema);