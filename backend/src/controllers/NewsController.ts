import { Request, Response } from 'express';

interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  category: 'AI' | 'Tech' | 'Productivity';
  source: string;
  readTime: string;
  url: string;
  accentColor: string;
  publishedAt: string;
}

const articles: NewsArticle[] = [
  // ─── AI ───
  {
    id: 'ai-1',
    title: 'OpenAI Unveils GPT-5 with Advanced Reasoning Capabilities',
    summary: 'OpenAI has released GPT-5, featuring dramatic improvements in multi-step reasoning and mathematical problem solving. The model can now tackle PhD-level questions across physics, chemistry, and law with over 90% accuracy. Early benchmarks show it outperforms all previous models on every standard evaluation.',
    category: 'AI',
    source: 'MIT Technology Review',
    readTime: '3 min read',
    url: 'https://www.technologyreview.com',
    accentColor: '#6366f1',
    publishedAt: '2 hours ago',
  },
  {
    id: 'ai-2',
    title: 'Claude 3.7 Sets New Bar for Code Generation',
    summary: "Anthropic's Claude 3.7 has achieved a 72% success rate on SWE-bench, the software engineering benchmark. It can now autonomously fix bugs, write test suites, and refactor large codebases with minimal human supervision. Developers report a 40% reduction in time spent on routine coding tasks.",
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
    summary: 'A new Stanford study shows students using AI tutors improved test scores by 1.5 grade levels in a single semester. The systems adapt to individual learning styles in real time, offering personalized explanations and practice problems. Researchers believe this could democratize access to high-quality education globally.',
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
    summary: 'Google has begun rolling out Gemini Ultra to all Workspace users, bringing AI summarization, drafting, and analysis to Gmail, Docs, and Sheets. The integration allows users to query spreadsheets in plain English and auto-generate slide presentations from research documents. Enterprise users report saving 2+ hours per day.',
    category: 'AI',
    source: 'TechCrunch',
    readTime: '2 min read',
    url: 'https://techcrunch.com',
    accentColor: '#6366f1',
    publishedAt: '3 days ago',
  },
  // ─── Tech ───
  {
    id: 'tech-1',
    title: 'Apple M4 Chip Delivers 3× Faster Neural Engine for On-Device AI',
    summary: 'Apple\'s M4 chip features a dramatically enhanced Neural Engine capable of 38 trillion operations per second. This enables on-device AI tasks like real-time transcription, image generation, and language model inference without cloud dependency. Privacy-first AI processing is now feasible for everyday consumer devices.',
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
    summary: 'WebGPU is now supported in Chrome, Firefox, and Safari, enabling GPU-accelerated graphics and computation directly in the browser. Developers can now run machine learning models and 3D simulations at near-native speed without plugins. The standard opens doors for browser-based scientific computing and game development.',
    category: 'Tech',
    source: 'Web.dev',
    readTime: '3 min read',
    url: 'https://web.dev',
    accentColor: '#0ea5e9',
    publishedAt: '6 hours ago',
  },
  {
    id: 'tech-3',
    title: 'Arc Browser Releases Spaces Feature for Context-Aware Browsing',
    summary: 'The Browser Company has shipped Spaces in Arc, letting users organize tabs, bookmarks, and web apps by project or context with automatic switching. The feature learns your workflow patterns and proactively surfaces relevant pages. Power users report it eliminates 80% of time spent searching through tab history.',
    category: 'Tech',
    source: 'The Browser Company Blog',
    readTime: '2 min read',
    url: 'https://arc.net',
    accentColor: '#0ea5e9',
    publishedAt: '2 days ago',
  },
  {
    id: 'tech-4',
    title: 'Microsoft Achieves Quantum Error Correction Milestone',
    summary: 'Microsoft Research has demonstrated a logical qubit with an error rate 100× lower than physical qubits, using topological qubits. This breakthrough brings practical quantum computing significantly closer, with potential applications in drug discovery and cryptography within the decade. The result was independently verified by multiple labs.',
    category: 'Tech',
    source: 'Nature',
    readTime: '5 min read',
    url: 'https://www.nature.com',
    accentColor: '#0ea5e9',
    publishedAt: '4 days ago',
  },
  // ─── Productivity ───
  {
    id: 'prod-1',
    title: 'The Science of Deep Work: Why 4 Hours of Focus Beats 10 Hours of Busyness',
    summary: "Cal Newport's research confirms that 4 hours of deep, uninterrupted work produces more output than a full day of fragmented tasks. The key is eliminating all digital distractions and batching shallow work like emails to a single time window. Students who adopted this approach reported finishing assignments in half the usual time.",
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
    summary: "Obsidian's networked note-taking approach is gaining traction among university students as a way to connect concepts across subjects and build a personal knowledge graph. Students report that linking ideas across courses leads to significantly better retention and more original essay arguments. The app is free, offline-first, and privacy respecting.",
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
    summary: 'A new study of 500 remote teams found that those using asynchronous communication as their default—reserving meetings for creative brainstorming only—completed projects 23% faster with higher satisfaction scores. The key enabler was detailed written documentation that eliminated the need for status update meetings. GitLab and Basecamp have long championed this model.',
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
    summary: "Researchers have refined the classic 25/5 Pomodoro cycle based on brain wave data, finding that 52-minute focus blocks followed by 17-minute breaks optimize prefrontal cortex performance. The updated technique also recommends ending each focus block mid-sentence to make re-entry easier. Apps implementing this schedule report 35% higher task completion rates.",
    category: 'Productivity',
    source: 'Huberman Lab',
    readTime: '3 min read',
    url: 'https://hubermanlab.com',
    accentColor: '#10b981',
    publishedAt: '2 days ago',
  },
];

export const getNews = (_req: Request, res: Response): void => {
  res.status(200).json({ articles });
};
