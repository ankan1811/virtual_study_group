// controllers/ChatController.ts

import { Request, Response } from 'express';
import Chat from '../models/Chat'
import jwt from 'jsonwebtoken';
import io from '../socketServer';
import dotenv from "dotenv";
dotenv.config();

export const getLoggedInUserName = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get the authorization header
    const authHeader = req.headers['authorization'];

    // Check if the authorization header is present
    if (!authHeader) {
      res.status(401).json({ error: 'Authorization header is missing' });
      return;
    }

    // Extract the token from the authorization header
    const token = authHeader.split(' ')[1];

    if (!process.env.JWT_SECRET) {
        throw new Error('JWT secret is not defined in environment variables');
      }
      
      const decodedToken = jwt.verify(token, process.env.JWT_SECRET) as { userId: string, name: string };
      
    // Extract the user name from the decoded token
    const userName = decodedToken.name;

    res.status(200).json({ "name":userName });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get logged-in user name' });
  }
};

export const viewusersinroom = async (req: Request, res: Response): Promise<void> => {
    const { room_id } = req.params;

  try {
    // Fetch chat history from the database for the specified room
    const chats = await Chat.find({ room_id });

    res.status(200).json({ chats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
  };


  export const addchat= async (req: Request, res: Response): Promise<void> => {  
  const { room_id, message } = req.body;

  // Emit the chat message to the Socket.IO server
  io.emit('chatMessage', { room_id, message });

  res.status(200).json({ message: 'Chat message sent successfully' });
  };