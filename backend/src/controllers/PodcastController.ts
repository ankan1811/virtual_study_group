import { Request, Response } from "express";
import { getRedis } from "../db/redis";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PodcastItem {
  id: string;
  title: string;
  publisher: string;
  description: string;
  thumbnail: string;
  totalEpisodes: number;
  listenScore: number | null;
  website: string | null;
  listenNotesUrl: string;
  audio: string | null;
  audioLengthSec: number | null;
  latestEpisodeTitle: string | null;
}

type Topic = "trending" | "ai" | "tech" | "business" | "productivity";

const VALID_TOPICS: Topic[] = [
  "trending",
  "ai",
  "tech",
  "business",
  "productivity",
];

// ─── Redis cache helpers ──────────────────────────────────────────────────────

interface PodcastCacheEntry {
  data: PodcastItem[];
  fetchedAt: string;
}

const PODCAST_TTL_SECONDS = 345600; // 4 days

async function readCache(topic: Topic): Promise<{ data: PodcastItem[]; fetchedAt: string } | null> {
  const redis = getRedis();
  const entry = await redis.get<PodcastCacheEntry>(`podcast:${topic}`);
  if (!entry) return null;
  return { data: entry.data, fetchedAt: entry.fetchedAt };
}

async function writeCache(topic: Topic, data: PodcastItem[]): Promise<void> {
  const redis = getRedis();
  const entry: PodcastCacheEntry = { data, fetchedAt: new Date().toISOString() };
  await redis.set(`podcast:v2:${topic}`, entry, { ex: PODCAST_TTL_SECONDS });
}

// ─── Cache validity: refresh on Tue (2) and Sat (6) ─────────────────────────

function getLastRefreshBoundary(): Date {
  const now = new Date();
  for (let daysBack = 0; daysBack < 7; daysBack++) {
    const d = new Date(now);
    d.setDate(now.getDate() - daysBack);
    d.setHours(0, 0, 0, 0);
    const dow = d.getDay(); // 0=Sun, 2=Tue, 6=Sat
    if (dow === 2 || dow === 6) return d;
  }
  return new Date(0);
}

function isCacheValid(fetchedAt: string): boolean {
  return new Date(fetchedAt).getTime() >= getLastRefreshBoundary().getTime();
}

// ─── Listen Notes API ─────────────────────────────────────────────────────────

const LN_BASE = "https://listen-api.listennotes.com/api/v2";

const TOPIC_URLS: Record<Topic, string> = {
  trending: `${LN_BASE}/best_podcasts?page=1&sort=listen_score`,
  ai: `${LN_BASE}/search?q=artificial+intelligence&type=podcast&language=English&sort_by_date=0`,
  tech: `${LN_BASE}/best_podcasts?genre_id=127&page=1`,
  business: `${LN_BASE}/best_podcasts?genre_id=93&page=1`,
  productivity: `${LN_BASE}/best_podcasts?genre_id=111&page=1`,
};

function mapApiResponse(data: Record<string, unknown>, topic: Topic): PodcastItem[] {
  const rawList: Record<string, unknown>[] =
    topic === "ai"
      ? ((data.results as Record<string, unknown>[]) || [])
      : ((data.podcasts as Record<string, unknown>[]) || []);

  return rawList.slice(0, 12).map((p) => ({
    id: (p.id as string) || String(Math.random()),
    title: (p.title_original as string) || (p.title as string) || "Untitled",
    publisher: (p.publisher_original as string) || (p.publisher as string) || "Unknown",
    description: (p.description_original as string) || (p.description as string) || "",
    thumbnail: (p.thumbnail as string) || (p.image as string) || "",
    totalEpisodes: (p.total_episodes as number) ?? 0,
    listenScore: p.listen_score != null ? Number(p.listen_score) : null,
    website: (p.website as string) || null,
    listenNotesUrl: (p.listennotes_url as string) || `https://www.listennotes.com/podcasts/${p.id}/`,
    audio: (p.audio as string) || null,
    audioLengthSec: (p.audio_length_sec as number) ?? null,
    latestEpisodeTitle: (p.latest_episode_title as string) || null,
  }));
}

// ─── iTunes Search API → RSS → Audio enrichment ─────────────────────────────

async function findRssUrl(title: string, publisher: string): Promise<string | null> {
  try {
    const query = encodeURIComponent(`${title} ${publisher}`);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(
      `https://itunes.apple.com/search?term=${query}&entity=podcast&limit=1`,
      { signal: ctrl.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: { feedUrl?: string }[] };
    return data.results?.[0]?.feedUrl || null;
  } catch {
    return null;
  }
}

async function parseRssForAudio(rssUrl: string): Promise<{
  audio: string | null;
  audioLengthSec: number | null;
  latestEpisodeTitle: string | null;
}> {
  const empty = { audio: null, audioLengthSec: null, latestEpisodeTitle: null };
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(rssUrl, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return empty;

    const xml = await res.text();

    // Find the first <item> block (latest episode)
    const itemMatch = xml.match(/<item[\s>]([\s\S]*?)<\/item>/);
    if (!itemMatch) return empty;
    const item = itemMatch[1];

    // Extract audio URL from <enclosure url="...">
    const encMatch = item.match(/<enclosure[^>]*url=["']([^"']+)["']/);
    const audio = encMatch?.[1] || null;

    // Extract episode title from <title>
    const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
    const latestEpisodeTitle = titleMatch?.[1]?.trim() || null;

    // Extract duration from <itunes:duration> (can be seconds or HH:MM:SS)
    const durMatch = item.match(/<itunes:duration>(.*?)<\/itunes:duration>/);
    let audioLengthSec: number | null = null;
    if (durMatch) {
      const d = durMatch[1].trim();
      if (d.includes(":")) {
        const parts = d.split(":").map(Number);
        audioLengthSec =
          parts.length === 3
            ? parts[0] * 3600 + parts[1] * 60 + parts[2]
            : parts[0] * 60 + parts[1];
      } else {
        audioLengthSec = parseInt(d, 10) || null;
      }
    }

    return { audio, audioLengthSec, latestEpisodeTitle };
  } catch {
    return empty;
  }
}

async function enrichWithAudio(items: PodcastItem[]): Promise<PodcastItem[]> {
  return Promise.all(
    items.map(async (item) => {
      const rssUrl = await findRssUrl(item.title, item.publisher);
      if (!rssUrl) return item;
      const rssData = await parseRssForAudio(rssUrl);
      return {
        ...item,
        audio: rssData.audio || item.audio,
        audioLengthSec: rssData.audioLengthSec || item.audioLengthSec,
        latestEpisodeTitle: rssData.latestEpisodeTitle || item.latestEpisodeTitle,
      };
    })
  );
}

async function fetchFromListenNotes(topic: Topic): Promise<PodcastItem[] | null> {
  const apiKey = process.env.LISTEN_NOTES_API_KEY;
  if (!apiKey) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(TOPIC_URLS[topic], {
      headers: { "X-ListenAPI-Key": apiKey },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[PodcastController] Listen Notes returned ${response.status} for ${topic}`);
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;
    const items = mapApiResponse(data, topic);
    if (items.length === 0) return null;

    // Enrich with actual audio from iTunes → RSS (parallel, 5s timeout each)
    const enriched = await enrichWithAudio(items);
    return enriched;
  } catch (err) {
    console.error(`[PodcastController] Fetch failed for ${topic}:`, (err as Error).message);
    return null;
  }
}

// ─── Cache refresh (used by cron job) ────────────────────────────────────────

export async function refreshTopicCache(topic: Topic): Promise<boolean> {
  const fresh = await fetchFromListenNotes(topic);
  if (fresh && fresh.length > 0) {
    await writeCache(topic, fresh);
    return true;
  }
  return false;
}

export { VALID_TOPICS };
export type { Topic };

// ─── Controller export ────────────────────────────────────────────────────────

export const getPodcasts = async (req: Request, res: Response): Promise<void> => {
  const { topic } = req.params;

  if (!VALID_TOPICS.includes(topic as Topic)) {
    res.status(400).json({ error: `Invalid topic. Valid: ${VALID_TOPICS.join(", ")}` });
    return;
  }

  const t = topic as Topic;

  try {
    const cached = await readCache(t);

    // Serve fresh cache immediately
    if (cached && isCacheValid(cached.fetchedAt)) {
      res.status(200).json({ data: cached.data, fetchedAt: cached.fetchedAt, source: "cache" });
      return;
    }

    // Try fetching from Listen Notes API
    const fresh = await fetchFromListenNotes(t);

    if (fresh && fresh.length > 0) {
      await writeCache(t, fresh);
      res.status(200).json({ data: fresh, fetchedAt: new Date().toISOString(), source: "api" });
      return;
    }

    // API failed — serve stale cache if available
    if (cached) {
      console.warn(`[PodcastController] API failed for "${t}", serving stale cache`);
      res.status(200).json({ data: cached.data, fetchedAt: cached.fetchedAt, source: "stale-cache" });
      return;
    }

    // No cache and API failed — return error
    console.warn(`[PodcastController] No cache and API failed for "${t}"`);
    res.status(503).json({ error: "Podcasts are temporarily unavailable. Please try again later." });
  } catch (err) {
    console.error(`[PodcastController] Unexpected error for "${t}":`, (err as Error).message);
    res.status(503).json({ error: "Podcasts are temporarily unavailable. Please try again later." });
  }
};
