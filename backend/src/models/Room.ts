import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './User'; // Import the IUser interface from User model

export interface IRoom extends Document {
  users: IUser[]; // Array of user objects in the room
}

const roomSchema: Schema = new Schema({
  users: [{ type: Schema.Types.ObjectId, ref: 'User' }] // Reference to User model
});

export default mongoose.model<IRoom>('Room', roomSchema);
