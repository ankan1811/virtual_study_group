import { Request, Response } from 'express';
import Room from '../models/Room';
import User from '../models/User'; // Import the User model

export const joinRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { room_id } = req.params;
    const { user_id } = req.body;

    // Find the room by ID
    const room = await Room.findById(room_id);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    // Find the user by ID
    const user = await User.findById(user_id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Add the user to the room
    room.users.push(user);
    await room.save();

    res.status(200).json({ message: 'User joined room successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to join room' });
  }
};

export const getUsersInRoom = async (req: Request, res: Response): Promise<void> => {
    try {
      const { room_id } = req.params;
  
      // Find the room by ID and populate the users field
      const room = await Room.findById(room_id).populate('users');
      if (!room) {
        res.status(404).json({ error: 'Room not found' });
        return;
      }
  
      res.status(200).json({ users: room.users });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch users in room' });
    }
  };