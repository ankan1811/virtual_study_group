import { Request, Response } from 'express';
import { getRedis } from '../db/redis';

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  category: 'AI' | 'Tech' | 'Productivity';
  source: string;
  readTime: string;
  url: string;
  imageUrl?: string;
  accentColor: string;
  publishedAt: string;
}

const categoryColors: Record<string, string> = {
  AI: '#6366f1',
  Tech: '#0ea5e9',
  Productivity: '#10b981',
};

const aiKeywords = /\bai\b|artificial intelligence|machine learning|deep learning|llm|gpt|chatgpt|claude|gemini|openai|anthropic|neural|generative|copilot/i;
const prodKeywords = /productiv|focus|habit|mindful|time management|workflow|remote work|work.life|burnout|pomodoro|note.?taking|obsidian|notion|study/i;

function categorize(title: string, description: string): 'AI' | 'Tech' | 'Productivity' {
  const text = `${title} ${description}`;
  if (aiKeywords.test(text)) return 'AI';
  if (prodKeywords.test(text)) return 'Productivity';
  return 'Tech';
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function estimateReadTime(text: string): string {
  const words = text.split(/\s+/).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

const REDIS_KEY = 'news:articles';
const CACHE_TTL = 86400; // 24 hours

// Fallback mock articles
const fallbackArticles: NewsArticle[] = [
  {
    id: 'ai-1',
    title: 'OpenAI Unveils GPT-5 with Advanced Reasoning Capabilities',
    summary: 'OpenAI has released GPT-5, featuring dramatic improvements in multi-step reasoning and mathematical problem solving. The model can now tackle PhD-level questions across physics, chemistry, and law with over 90% accuracy.',
    category: 'AI',
    source: 'MIT Technology Review',
    readTime: '3 min read',
    url: 'https://www.technologyreview.com',
    accentColor: '#6366f1',
    publishedAt: '2 hours ago',
  },
  {
    id: 'ai-2',
    title: 'Claude Sets New Bar for Code Generation and Reasoning',
    summary: "Anthropic's Claude has achieved a 72% success rate on SWE-bench, the software engineering benchmark. It can now autonomously fix bugs, write test suites, and refactor large codebases with minimal human supervision.",
    category: 'AI',
    source: 'The Verge',
    readTime: '2 min read',
    url: 'https://www.theverge.com',
    accentColor: '#6366f1',
    publishedAt: '5 hours ago',
  },
  {
    id: 'ai-3',
    title: 'AI Tutoring Systems Are Closing the Education Gap',
    summary: 'A new Stanford study shows students using AI tutors improved test scores by 1.5 grade levels in a single semester. The systems adapt to individual learning styles in real time, offering personalized explanations.',
    category: 'AI',
    source: 'Stanford HAI',
    readTime: '4 min read',
    url: 'https://hai.stanford.edu',
    accentColor: '#6366f1',
    publishedAt: '1 day ago',
  },
  {
    id: 'ai-4',
    title: 'Google Integrates Gemini Ultra Into Workspace Across All Apps',
    summary: 'Google has begun rolling out Gemini Ultra to all Workspace users, bringing AI summarization, drafting, and analysis to Gmail, Docs, and Sheets. Enterprise users report saving 2+ hours per day.',
    category: 'AI',
    source: 'TechCrunch',
    readTime: '2 min read',
    url: 'https://techcrunch.com',
    accentColor: '#6366f1',
    publishedAt: '3 days ago',
  },
  {
    id: 'tech-1',
    title: 'Apple M4 Chip Delivers 3x Faster Neural Engine for On-Device AI',
    summary: "Apple's M4 chip features a dramatically enhanced Neural Engine capable of 38 trillion operations per second. This enables on-device AI tasks like real-time transcription and image generation without cloud dependency.",
    category: 'Tech',
    source: 'Ars Technica',
    readTime: '3 min read',
    url: 'https://arstechnica.com',
    accentColor: '#0ea5e9',
    publishedAt: '4 hours ago',
  },
  {
    id: 'tech-2',
    title: 'WebGPU Standard Reaches Full Adoption Across Major Browsers',
    summary: 'WebGPU is now supported in Chrome, Firefox, and Safari, enabling GPU-accelerated graphics and computation directly in the browser. Developers can now run ML models at near-native speed without plugins.',
    category: 'Tech',
    source: 'Web.dev',
    readTime: '3 min read',
    url: 'https://web.dev',
    accentColor: '#0ea5e9',
    publishedAt: '6 hours ago',
  },
  {
    id: 'tech-3',
    title: 'React 19 Ships with Built-in Server Components and Actions',
    summary: 'React 19 has been released with server components as a first-class feature, along with form actions and optimistic UI support. The new compiler eliminates the need for manual memoization.',
    category: 'Tech',
    source: 'React Blog',
    readTime: '2 min read',
    url: 'https://react.dev',
    accentColor: '#0ea5e9',
    publishedAt: '2 days ago',
  },
  {
    id: 'tech-4',
    title: 'Microsoft Achieves Quantum Error Correction Milestone',
    summary: 'Microsoft Research has demonstrated a logical qubit with an error rate 100x lower than physical qubits. This breakthrough brings practical quantum computing significantly closer.',
    category: 'Tech',
    source: 'Nature',
    readTime: '5 min read',
    url: 'https://www.nature.com',
    accentColor: '#0ea5e9',
    publishedAt: '4 days ago',
  },
  {
    id: 'prod-1',
    title: 'The Science of Deep Work: Why 4 Hours of Focus Beats 10 Hours of Busyness',
    summary: "Cal Newport's research confirms that 4 hours of deep, uninterrupted work produces more output than a full day of fragmented tasks. Students who adopted this approach reported finishing assignments in half the usual time.",
    category: 'Productivity',
    source: 'Farnam Street',
    readTime: '4 min read',
    url: 'https://fs.blog',
    accentColor: '#10b981',
    publishedAt: '3 hours ago',
  },
  {
    id: 'prod-2',
    title: 'How Students Are Using Obsidian to Build a Second Brain',
    summary: "Obsidian's networked note-taking approach is gaining traction among university students as a way to connect concepts across subjects and build a personal knowledge graph for better retention.",
    category: 'Productivity',
    source: 'Ness Labs',
    readTime: '3 min read',
    url: 'https://nesslabs.com',
    accentColor: '#10b981',
    publishedAt: '8 hours ago',
  },
  {
    id: 'prod-3',
    title: 'Async-First Teams Outperform Real-Time Communicators by 23%',
    summary: 'A new study of 500 remote teams found that those using asynchronous communication as their default completed projects 23% faster with higher satisfaction scores.',
    category: 'Productivity',
    source: 'Harvard Business Review',
    readTime: '4 min read',
    url: 'https://hbr.org',
    accentColor: '#10b981',
    publishedAt: '1 day ago',
  },
  {
    id: 'prod-4',
    title: 'The Pomodoro Technique Gets a Scientific Upgrade',
    summary: 'Researchers have refined the classic 25/5 Pomodoro cycle based on brain wave data, finding that 52-minute focus blocks followed by 17-minute breaks optimize prefrontal cortex performance.',
    category: 'Productivity',
    source: 'Huberman Lab',
    readTime: '3 min read',
    url: 'https://hubermanlab.com',
    accentColor: '#10b981',
    publishedAt: '2 days ago',
  },
];

async function fetchFromNewsAPI(): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey) return fallbackArticles;

  try {
    const url = `https://newsapi.org/v2/everything?q=(AI OR technology OR productivity OR programming)&language=en&sortBy=publishedAt&pageSize=20&apiKey=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`NewsAPI ${response.status}`);

    const data = await response.json();
    if (!data.articles || data.articles.length === 0) return fallbackArticles;

    const mapped: NewsArticle[] = data.articles
      .filter((a: any) => a.title && a.title !== '[Removed]' && a.description)
      .map((a: any, i: number) => {
        const cat = categorize(a.title || '', a.description || '');
        return {
          id: `news-${i}`,
          title: a.title,
          summary: a.description || '',
          category: cat,
          source: a.source?.name || 'Unknown',
          readTime: estimateReadTime(a.description || ''),
          url: a.url || '#',
          imageUrl: a.urlToImage || undefined,
          accentColor: categoryColors[cat],
          publishedAt: a.publishedAt ? timeAgo(a.publishedAt) : 'Recently',
        };
      });

    return mapped.length > 0 ? mapped : fallbackArticles;
  } catch (err) {
    console.error('NewsAPI fetch failed, using fallback:', (err as Error).message);
    return fallbackArticles;
  }
}

export const getNews = async (_req: Request, res: Response): Promise<void> => {
  const redis = getRedis();

  // Return cached if fresh
  const cached = await redis.get<NewsArticle[]>(REDIS_KEY);
  if (cached) {
    res.status(200).json(cached);
    return;
  }

  const articles = await fetchFromNewsAPI();
  await redis.set(REDIS_KEY, articles, { ex: CACHE_TTL });
  res.status(200).json(articles);
};
