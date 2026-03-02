import { Router } from 'express';
import { verifyToken } from '../middlewares/middleware';
import {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
} from '../controllers/NotificationController';

const router = Router();

router.get('/', verifyToken, getNotifications);
router.patch('/:id/read', verifyToken, markRead);
router.patch('/read-all', verifyToken, markAllRead);
router.delete('/:id', verifyToken, deleteNotification);

export default router;
