import { Request, Response } from 'express';
import { findById } from '../db/queries/users';
import {
  createRoom as dbCreateRoom,
  findRoomById,
  addUserToRoom,
  getUsersInRoom,
} from '../db/queries/rooms';


export const createRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { room_id, user_id } = req.body;

    const user = await findById(user_id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (room_id) {
      const room = await findRoomById(room_id);
      if (!room) {
        res.status(404).json({ error: 'Invalid room ID' });
        return;
      }
      await addUserToRoom(room.id, user.id);
      res.status(200).json({ message: 'User added to the existing room successfully' });
    } else {
      const newRoom = await dbCreateRoom();
      await addUserToRoom(newRoom.id, user.id);
      res.status(201).json({ message: 'New room created successfully' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create room' });
  }
};

export const joinRoom = async (req: Request, res: Response): Promise<void> => {
  try {
    const { room_id } = req.params;
    const { user_id } = req.body;

    const room = await findRoomById(room_id);
    if (!room) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    const user = await findById(user_id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await addUserToRoom(room.id, user.id);
    res.status(200).json({ message: 'User joined room successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to join room' });
  }
};

export const getUsersInRoomController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { room_id } = req.params;
    const users = await getUsersInRoom(room_id);
    if (users.length === 0) {
      res.status(404).json({ error: 'Room not found or empty' });
      return;
    }
    res.status(200).json({ users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch users in room' });
  }
};
