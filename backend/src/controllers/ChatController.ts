// controllers/ChatController.ts

import { Request, Response } from "express";
import crypto from "crypto";
import Chat from "../models/Chat";
import jwt from "jsonwebtoken";
import { getIO } from "../socketServer";
import { AuthenticatedRequest } from "../middlewares/middleware";
import dotenv from "dotenv";
dotenv.config();

export const getLoggedInUserName = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Get the authorization header
    const authHeader = req.headers["authorization"];

    // Check if the authorization header is present
    if (!authHeader) {
      res.status(401).json({ error: "Authorization header is missing" });
      return;
    }

    // Extract the token from the authorization header
    const token = authHeader.split(" ")[1];

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT secret is not defined in environment variables");
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET) as {
      userId: string;
      name: string;
    };

    // Extract the user name from the decoded token
    const userName = decodedToken.name;

    res.status(200).json({ name: userName });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to get logged-in user name" });
  }
};

export const viewusersinroom = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { room_id } = req.params;

  try {
    // Fetch chat history from the database for the specified room
    const chats = await Chat.find({ room_id });

    res.status(200).json({ chats });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch chat history" });
  }
};

export const addchat = async (req: Request, res: Response): Promise<void> => {
  const { room_id, message, user } = req.body;

  // Emit the chat message to the Socket.IO server
  getIO()?.emit("chatMessage", { user, message });

  res.status(200).json({ message: "Chat message sent successfully" });
};

export const bulkSaveChats = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { roomId, messages } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!roomId || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "roomId and a non-empty messages array are required" });
      return;
    }

    // Cap at 500 messages to prevent abuse
    const capped = messages.slice(0, 500);

    // Filter out bot messages
    const userMessages = capped.filter(
      (m: { msg: string; sentby: string }) => m.sentby !== "bot"
    );

    if (userMessages.length === 0) {
      res.status(400).json({ error: "No user messages to save" });
      return;
    }

    const sessionId = crypto.randomUUID();

    const docs = userMessages.map((m: { msg: string; sentby: string }) => ({
      sendBy: userId,
      senderName: m.sentby,
      message: m.msg,
      room_id: roomId,
      sessionId,
    }));

    await Chat.insertMany(docs);

    res.status(200).json({ success: true, count: docs.length, sessionId });
  } catch (error) {
    console.error("bulkSaveChats error:", error);
    res.status(500).json({ error: "Failed to save chat messages" });
  }
};
