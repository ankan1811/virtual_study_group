// middleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Define an interface to extend the Request type
interface AuthenticatedRequest extends Request {
  user?: any; // Define the user property
}

// Middleware function to verify JWT token
export const verifyToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  // Get token from request headers
  const token = req.headers.authorization;

  // Check if token is provided
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  // Verify token
  jwt.verify(token, process.env.JWT_SECRET || '', (err: any, decoded: any) => {
    if (err) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // Store decoded token in request object for further use
    req.user = decoded;
    next(); // Move to the next middleware or route handler
  });
};