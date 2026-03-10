import cron from "node-cron";
import { refreshTopicCache, VALID_TOPICS, type Topic } from "../controllers/PodcastController";

// Runs at 02:00 AM every Tuesday (2) and Saturday (6)
// Cron: minute hour * * day-of-week
const SCHEDULE = "0 2 * * 2,6";

async function runRefresh(): Promise<void> {
  console.log("[PodcastCacheJob] Starting scheduled refresh for all topics…");
  const results: { topic: Topic; ok: boolean }[] = [];

  for (const topic of VALID_TOPICS as Topic[]) {
    try {
      const ok = await refreshTopicCache(topic);
      results.push({ topic, ok });
      // Small delay between calls to be kind to the API
      await new Promise((resolve) => setTimeout(resolve, 1500));
    } catch (err) {
      console.error(`[PodcastCacheJob] Error refreshing "${topic}":`, (err as Error).message);
      results.push({ topic, ok: false });
    }
  }

  const succeeded = results.filter((r) => r.ok).map((r) => r.topic);
  const failed = results.filter((r) => !r.ok).map((r) => r.topic);

  if (succeeded.length > 0) {
    console.log(`[PodcastCacheJob] ✓ Refreshed: ${succeeded.join(", ")}`);
  }
  if (failed.length > 0) {
    console.warn(`[PodcastCacheJob] ✗ Failed (stale cache kept): ${failed.join(", ")}`);
  }
  console.log(`[PodcastCacheJob] Done — ${succeeded.length}/${VALID_TOPICS.length} topics updated.`);
}

export function startPodcastCacheJob(): void {
  if (!process.env.LISTEN_NOTES_API_KEY) {
    console.warn("[PodcastCacheJob] LISTEN_NOTES_API_KEY not set — job registered but will produce no results.");
  }

  cron.schedule(SCHEDULE, runRefresh, {
    timezone: "UTC",
  });

  console.log(`[PodcastCacheJob] Scheduled — runs every Tue & Sat at 02:00 UTC (${SCHEDULE})`);
}
