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
  source: 'api' | 'mock';
}

const PODCAST_TTL_SECONDS = 345600; // 4 days

async function readCache(topic: Topic): Promise<{ data: PodcastItem[]; fetchedAt: string } | null> {
  const redis = getRedis();
  const entry = await redis.get<PodcastCacheEntry>(`podcast:${topic}`);
  if (!entry) return null;
  return { data: entry.data, fetchedAt: entry.fetchedAt };
}

async function writeCache(topic: Topic, data: PodcastItem[], source: 'api' | 'mock' = 'api'): Promise<void> {
  const redis = getRedis();
  const entry: PodcastCacheEntry = { data, fetchedAt: new Date().toISOString(), source };
  await redis.set(`podcast:${topic}`, entry, { ex: PODCAST_TTL_SECONDS });
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
    listenNotesUrl: `https://www.listennotes.com/podcasts/${p.id}/`,
  }));
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
    return items.length > 0 ? items : null;
  } catch (err) {
    console.error(`[PodcastController] Fetch failed for ${topic}:`, (err as Error).message);
    return null;
  }
}

// ─── Mock fallback data ───────────────────────────────────────────────────────

const MOCK_FALLBACK: Record<Topic, PodcastItem[]> = {
  trending: [
    {
      id: "mock-trend-1",
      title: "Lex Fridman Podcast",
      publisher: "Lex Fridman",
      description:
        "Conversations about the nature of intelligence, consciousness, love, and power. Lex interviews scientists, engineers, artists, entrepreneurs, philosophers, and activists.",
      thumbnail:
        "https://production.listennotes.com/podcasts/lex-fridman-podcast-lex-fridman-Rj9bvFQ-1p1.300x300.jpg",
      totalEpisodes: 420,
      listenScore: 97,
      website: "https://lexfridman.com/podcast",
      listenNotesUrl: "https://www.listennotes.com/podcasts/lex-fridman-podcast-lex-fridman-Rj9bvFQ/",
    },
    {
      id: "mock-trend-2",
      title: "The Tim Ferriss Show",
      publisher: "Tim Ferriss",
      description:
        "Tim Ferriss interviews world-class performers from eclectic areas — investing, sports, business, art, and more — to extract the tactics, tools, and routines you can use.",
      thumbnail:
        "https://production.listennotes.com/podcasts/the-tim-ferriss-show-tim-ferriss-7hBbNStM5hk.300x300.jpg",
      totalEpisodes: 700,
      listenScore: 95,
      website: "https://tim.blog/podcast",
      listenNotesUrl: "https://www.listennotes.com/podcasts/the-tim-ferriss-show-tim-ferriss-7hBbNStM5hk/",
    },
    {
      id: "mock-trend-3",
      title: "How I Built This with Guy Raz",
      publisher: "NPR",
      description:
        "Guy Raz interviews the world's best-known entrepreneurs to learn how they built their famous companies. Includes HIBT Lab — startups pitching their latest ventures.",
      thumbnail:
        "https://production.listennotes.com/podcasts/how-i-built-this-with-guy-raz-npr-2yIqkrDCBgR.300x300.jpg",
      totalEpisodes: 530,
      listenScore: 93,
      website: "https://www.npr.org/podcasts/510313/how-i-built-this",
      listenNotesUrl: "https://www.listennotes.com/podcasts/how-i-built-this-with-guy-raz-npr-2yIqkrDCBgR/",
    },
  ],
  ai: [
    {
      id: "mock-ai-1",
      title: "The TWIML AI Podcast",
      publisher: "Sam Charrington",
      description:
        "This Week in Machine Learning & AI brings interviews and new content from the leading minds in machine learning and artificial intelligence.",
      thumbnail:
        "https://production.listennotes.com/podcasts/the-twiml-ai-podcast-formerly-this-week-in-M7K9Rqkj-k1.300x300.jpg",
      totalEpisodes: 650,
      listenScore: 84,
      website: "https://twimlai.com",
      listenNotesUrl: "https://www.listennotes.com/podcasts/the-twiml-ai-podcast-formerly-this-week-in-M7K9Rqkj/",
    },
    {
      id: "mock-ai-2",
      title: "No Priors: Artificial Intelligence",
      publisher: "Sarah Guo & Elad Gil",
      description:
        "No Priors is a show about technology, artificial intelligence, and machine learning. Sarah Guo and Elad Gil talk to the people building and shaping AI.",
      thumbnail:
        "https://production.listennotes.com/podcasts/no-priors-artificial-intelligence-technology-mXnLj7V7O0t.300x300.jpg",
      totalEpisodes: 90,
      listenScore: 82,
      website: "https://www.no-priors.com",
      listenNotesUrl: "https://www.listennotes.com/podcasts/no-priors-artificial-intelligence-technology-mXnLj7V7O0t/",
    },
    {
      id: "mock-ai-3",
      title: "Practical AI: Machine Learning, Data Science",
      publisher: "Changelog Media",
      description:
        "Making AI practical, productive, and accessible to everyone. Join in for conversations that make AI approachable for all levels of technical expertise.",
      thumbnail:
        "https://production.listennotes.com/podcasts/practical-ai-machine-learning-data-science-2K8Bf_faMrr.300x300.jpg",
      totalEpisodes: 260,
      listenScore: 79,
      website: "https://changelog.com/practicalai",
      listenNotesUrl: "https://www.listennotes.com/podcasts/practical-ai-machine-learning-data-science-2K8Bf_faMrr/",
    },
  ],
  tech: [
    {
      id: "mock-tech-1",
      title: "Darknet Diaries",
      publisher: "Jack Rhysider",
      description:
        "True stories from the dark side of the Internet — hacking, data breaches, cybercrime, and the culture around them. Told in a narrative style.",
      thumbnail:
        "https://production.listennotes.com/podcasts/darknet-diaries-jack-rhysider-EvT8TYS8iFu.300x300.jpg",
      totalEpisodes: 145,
      listenScore: 91,
      website: "https://darknetdiaries.com",
      listenNotesUrl: "https://www.listennotes.com/podcasts/darknet-diaries-jack-rhysider-EvT8TYS8iFu/",
    },
    {
      id: "mock-tech-2",
      title: "Software Engineering Daily",
      publisher: "Software Engineering Daily",
      description:
        "Technical interviews about software topics. A deep dive into the technology and software that powers today's products and services.",
      thumbnail:
        "https://production.listennotes.com/podcasts/software-engineering-daily-software-k8Vu0_EfwcJ.300x300.jpg",
      totalEpisodes: 1800,
      listenScore: 82,
      website: "https://softwareengineeringdaily.com",
      listenNotesUrl: "https://www.listennotes.com/podcasts/software-engineering-daily-software-k8Vu0_EfwcJ/",
    },
    {
      id: "mock-tech-3",
      title: "Changelog: Software Development, Open Source",
      publisher: "Changelog Media",
      description:
        "Conversations with the hackers, leaders, and innovators of the software world. The Changelog covers what's fresh and new in open source and software development.",
      thumbnail:
        "https://production.listennotes.com/podcasts/changelog-software-development-open-source-nSJbdJRHMmk.300x300.jpg",
      totalEpisodes: 600,
      listenScore: 83,
      website: "https://changelog.com/podcast",
      listenNotesUrl: "https://www.listennotes.com/podcasts/changelog-software-development-open-source-nSJbdJRHMmk/",
    },
  ],
  business: [
    {
      id: "mock-biz-1",
      title: "Masters of Scale",
      publisher: "WaitWhat",
      description:
        "Host Reid Hoffman — LinkedIn co-founder, Greylock partner — tests his theories about how companies grow with the world's most iconic business leaders.",
      thumbnail:
        "https://production.listennotes.com/podcasts/masters-of-scale-waitwhat-M2HBpE2uIJg.300x300.jpg",
      totalEpisodes: 220,
      listenScore: 88,
      website: "https://mastersofscale.com",
      listenNotesUrl: "https://www.listennotes.com/podcasts/masters-of-scale-waitwhat-M2HBpE2uIJg/",
    },
    {
      id: "mock-biz-2",
      title: "The Prof G Pod with Scott Galloway",
      publisher: "Vox Media Podcast Network",
      description:
        "Professor Scott Galloway combines business insights with wit to analyze current events in business and technology, offering advice on career and life.",
      thumbnail:
        "https://production.listennotes.com/podcasts/the-prof-g-pod-with-scott-galloway-vox-media-C3vRl33qJlj.300x300.jpg",
      totalEpisodes: 320,
      listenScore: 86,
      website: "https://podcasts.voxmedia.com/show/the-prof-g-pod-with-scott-galloway",
      listenNotesUrl: "https://www.listennotes.com/podcasts/the-prof-g-pod-with-scott-galloway-vox-media-C3vRl33qJlj/",
    },
    {
      id: "mock-biz-3",
      title: "Acquired",
      publisher: "Ben Gilbert and David Rosenthal",
      description:
        "Every company has a story. Join Ben and David every episode to dive deep into the history and strategy of the world's greatest companies and business empires.",
      thumbnail:
        "https://production.listennotes.com/podcasts/acquired-ben-gilbert-and-david-rosenthal-7rFQY0gNNf2.300x300.jpg",
      totalEpisodes: 190,
      listenScore: 90,
      website: "https://www.acquired.fm",
      listenNotesUrl: "https://www.listennotes.com/podcasts/acquired-ben-gilbert-and-david-rosenthal-7rFQY0gNNf2/",
    },
  ],
  productivity: [
    {
      id: "mock-prod-1",
      title: "The Productivity Show",
      publisher: "Asian Efficiency",
      description:
        "Learn how to get more done with tools, systems, and habits. Asian Efficiency shares practical strategies for getting the most out of technology and your time.",
      thumbnail:
        "https://production.listennotes.com/podcasts/the-productivity-show-asian-efficiency-E7aYkPxZJjk.300x300.jpg",
      totalEpisodes: 500,
      listenScore: 76,
      website: "https://www.asianefficiency.com/podcast",
      listenNotesUrl: "https://www.listennotes.com/podcasts/the-productivity-show-asian-efficiency-E7aYkPxZJjk/",
    },
    {
      id: "mock-prod-2",
      title: "Deep Questions with Cal Newport",
      publisher: "Cal Newport",
      description:
        "Cal Newport, author of Deep Work and Digital Minimalism, answers questions about cultivating deep focus, developing a deep life, and thriving in a distracted world.",
      thumbnail:
        "https://production.listennotes.com/podcasts/deep-questions-with-cal-newport-cal-newport-X0N5Kzj4b7W.300x300.jpg",
      totalEpisodes: 290,
      listenScore: 83,
      website: "https://www.calnewport.com/podcast",
      listenNotesUrl: "https://www.listennotes.com/podcasts/deep-questions-with-cal-newport-cal-newport-X0N5Kzj4b7W/",
    },
    {
      id: "mock-prod-3",
      title: "Cortex",
      publisher: "Relay FM",
      description:
        "CGP Grey and Myke Hurley share their working lives — tools, workflows, and habits for building a creative career while staying sane and productive.",
      thumbnail:
        "https://production.listennotes.com/podcasts/cortex-cgp-grey-myke-hurley-VrNk0W8F2l7.300x300.jpg",
      totalEpisodes: 150,
      listenScore: 80,
      website: "https://www.relay.fm/cortex",
      listenNotesUrl: "https://www.listennotes.com/podcasts/cortex-cgp-grey-myke-hurley-VrNk0W8F2l7/",
    },
  ],
};

// ─── Cache refresh (used by cron job) ────────────────────────────────────────

export async function refreshTopicCache(topic: Topic): Promise<boolean> {
  const fresh = await fetchFromListenNotes(topic);
  if (fresh && fresh.length > 0) {
    await writeCache(topic, fresh, 'api');
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
      await writeCache(t, fresh, 'api');
      res.status(200).json({ data: fresh, fetchedAt: new Date().toISOString(), source: "api" });
      return;
    }

    // API failed — serve stale cache if available
    if (cached) {
      console.warn(`[PodcastController] API failed for "${t}", serving stale cache`);
      res.status(200).json({ data: cached.data, fetchedAt: cached.fetchedAt, source: "stale-cache" });
      return;
    }

    // No cache at all — serve mock fallback and cache it
    console.warn(`[PodcastController] No cache for "${t}", serving mock fallback`);
    await writeCache(t, MOCK_FALLBACK[t], 'mock');
    res.status(200).json({
      data: MOCK_FALLBACK[t],
      fetchedAt: new Date().toISOString(),
      source: "mock",
    });
  } catch (err) {
    console.error(`[PodcastController] Unexpected error for "${t}":`, (err as Error).message);
    // Emergency fallback — never let the endpoint crash
    res.status(200).json({
      data: MOCK_FALLBACK[t],
      fetchedAt: new Date().toISOString(),
      source: "mock",
    });
  }
};
