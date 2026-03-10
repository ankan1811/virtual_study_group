import { Router } from "express";
import { getPodcasts } from "../controllers/PodcastController";

const router = Router();

// Public — no auth required (same as /news)
router.get("/:topic", getPodcasts);

export default router;
