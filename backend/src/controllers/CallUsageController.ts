import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/middleware';
import { getRemainingSeconds, incrementCallUsage, MAX_DAILY_CALL_SECONDS } from '../helpers/callUsage';

export const getCallTimeRemaining = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const remainingSeconds = await getRemainingSeconds(userId);
    res.status(200).json({ remainingSeconds, limitSeconds: MAX_DAILY_CALL_SECONDS });
  } catch (error) {
    console.error('[CallUsage] getCallTimeRemaining error:', error);
    res.status(500).json({ error: 'Failed to fetch call usage' });
  }
};

export const reportCallUsage = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const raw = Number(req.body?.deltaSeconds);
    if (!Number.isInteger(raw) || raw <= 0) {
      res.status(400).json({ error: 'deltaSeconds must be a positive integer' });
      return;
    }
    const deltaSeconds = Math.min(raw, 120); // cap at 2 minutes per sync

    const newTotal = await incrementCallUsage(userId, deltaSeconds);
    const remainingSeconds = Math.max(0, MAX_DAILY_CALL_SECONDS - newTotal);
    res.status(200).json({ remainingSeconds, exceeded: remainingSeconds <= 0 });
  } catch (error) {
    console.error('[CallUsage] reportCallUsage error:', error);
    res.status(500).json({ error: 'Failed to report call usage' });
  }
};
