import { Router } from 'express';
import { getNews } from '../controllers/NewsController';

const router = Router();

router.get('/', getNews);

export default router;
