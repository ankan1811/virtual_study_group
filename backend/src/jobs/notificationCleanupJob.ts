import cron from 'node-cron';
import { deleteExpiredNotifications } from '../db/queries/notifications';

// Runs daily at 03:00 UTC — mirrors the 10-day TTL that MongoDB's
// expireAfterSeconds: 864000 index previously enforced automatically.
const SCHEDULE = '0 3 * * *';

async function runCleanup(): Promise<void> {
  try {
    const deleted = await deleteExpiredNotifications();
    if (deleted > 0) {
      console.log(`[NotificationCleanupJob] Deleted ${deleted} expired notifications`);
    }
  } catch (err) {
    console.error('[NotificationCleanupJob] Cleanup failed:', err);
  }
}

export function startNotificationCleanupJob(): void {
  cron.schedule(SCHEDULE, runCleanup, { timezone: 'UTC' });
  console.log('[NotificationCleanupJob] Scheduled — runs daily at 03:00 UTC');
}
