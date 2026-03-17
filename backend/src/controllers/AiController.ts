import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/middleware';
import OpenAI from 'openai';
import Summary from '../models/Summary';
import { RATE_LIMIT_CONFIG } from '../middlewares/rateLimiter';
import { incrementEmbeddingCount } from '../db/queries/embeddingCounters';
import { getDmTranscript } from '../db/queries/directMessages';

// ── Provider config ──────────────────────────────────────────────
const providers = {
  gemini: {
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    model: 'gemini-2.5-flash',
    getApiKey: () => process.env.GEMINI_API_KEY || '',
  },
  grok: {
    baseURL: 'https://api.x.ai/v1',
    model: 'grok-3-mini',
    getApiKey: () => process.env.GROK_API_KEY || '',
  },
} as const;

type ProviderName = keyof typeof providers;

// ── Lazy-initialized client ──────────────────────────────────────
// Uses a getter so process.env is read AFTER dotenv.config() runs
// (module-level code executes before dotenv.config in server.ts)
let _client: OpenAI | null = null;
let _model: string = '';

function getClient(): OpenAI {
  if (!_client) {
    const name = (process.env.AI_PROVIDER || 'gemini') as ProviderName;
    const config = providers[name] || providers.gemini;
    _client = new OpenAI({
      apiKey: config.getApiKey(),
      baseURL: config.baseURL,
    });
    _model = config.model;
    console.log(`AI provider initialized: ${name} (model: ${_model})`);
  }
  return _client;
}

function getModel(): string {
  getClient();
  return _model;
}

// ── Helpers ──────────────────────────────────────────────────────
function describeWhiteboardElements(
  elements: Array<{ type: string; text?: string; width?: number; height?: number }>
): string {
  return elements
    .map((el) => {
      if (el.type === 'text' && el.text) return `Text: "${el.text}"`;
      return `Shape: ${el.type} (${Math.round(el.width || 0)}x${Math.round(el.height || 0)})`;
    })
    .join('\n');
}

// ── Controllers ──────────────────────────────────────────────────
export const askDoubt = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { question } = req.body as { question: string };

    if (!question || question.trim().length === 0) {
      res.status(400).json({ error: 'Question is required' });
      return;
    }

    const completion = await getClient().chat.completions.create({
      model: getModel(),
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful study assistant. Answer questions clearly and concisely. Use simple language and examples where helpful. Format answers with bullet points or numbered steps when appropriate.',
        },
        { role: 'user', content: question.trim() },
      ],
      max_tokens: 500,
    });

    const answer = completion.choices[0]?.message?.content || 'Sorry, I could not generate an answer.';
    res.status(200).json({ answer });
  } catch (error: any) {
    console.error('AI API error:', error?.message);
    res.status(500).json({ error: 'AI is currently unavailable. Please try again later.' });
  }
};

export const summarizeSession = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { messages } = req.body as { messages: { sentby: string; msg: string }[] };

    if (!messages || messages.length === 0) {
      res.status(400).json({ error: 'No messages to summarize' });
      return;
    }

    const chatText = messages
      .filter((m) => m.sentby !== 'bot')
      .map((m) => `${m.sentby}: ${m.msg}`)
      .join('\n');

    const completion = await getClient().chat.completions.create({
      model: getModel(),
      messages: [
        {
          role: 'system',
          content:
            'You are a study session summarizer. Given a chat log from a study session, produce a concise bullet-point summary highlighting: the main topics discussed, key concepts explained, any questions that were raised, and conclusions or next steps. Be brief and useful.',
        },
        {
          role: 'user',
          content: `Summarize this study session chat:\n\n${chatText}`,
        },
      ],
      max_tokens: 400,
    });

    const summary = completion.choices[0]?.message?.content || 'Could not generate summary.';
    res.status(200).json({ summary });
  } catch (error: any) {
    console.error('AI API error:', error?.message);
    res.status(500).json({ error: 'AI is currently unavailable. Please try again later.' });
  }
};

// ── Whiteboard explain ───────────────────────────────────────────
export const explainWhiteboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { elements, question } = req.body as {
      elements: Array<{ type: string; text?: string; width?: number; height?: number }>;
      question?: string;
    };

    if (!elements || elements.length === 0) {
      res.status(400).json({ error: 'Whiteboard is empty. Draw something first.' });
      return;
    }

    const description = describeWhiteboardElements(elements);
    const userPrompt = question
      ? `User question: ${question}\n\nWhiteboard contents:\n${description}`
      : `Explain and analyze this whiteboard:\n${description}`;

    const completion = await getClient().chat.completions.create({
      model: getModel(),
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful study assistant analyzing a whiteboard drawing from a study session. ' +
            'Describe what you see, explain any concepts depicted, identify relationships between elements, ' +
            'and provide educational insights. Be concise but thorough. Use bullet points for clarity.',
        },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 600,
    });

    const explanation = completion.choices[0]?.message?.content || 'Could not generate an explanation.';
    res.status(200).json({ explanation });
  } catch (error: any) {
    console.error('AI whiteboard error:', error?.message);
    res.status(500).json({ error: 'AI is currently unavailable. Please try again later.' });
  }
};

// ── DM summary ──────────────────────────────────────────────────
export const summarizeDm = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { companionId } = req.body as { companionId: string };
    const me = req.user?.userId;

    if (!companionId) {
      res.status(400).json({ error: 'companionId is required' });
      return;
    }

    const messages = await getDmTranscript(me!, companionId);

    if (!messages.length) {
      res.status(400).json({ error: 'No DM messages to summarize' });
      return;
    }

    const chatText = messages
      .map((m) => `${m.fromName}: ${m.content}`)
      .join('\n');

    const completion = await getClient().chat.completions.create({
      model: getModel(),
      messages: [
        {
          role: 'system',
          content:
            'You are a study session summarizer. Given a direct message conversation between two study companions, produce a concise bullet-point summary highlighting: the main topics discussed, key concepts explained, any questions that were raised, and conclusions or next steps. Be brief and useful.',
        },
        {
          role: 'user',
          content: `Summarize this DM conversation:\n\n${chatText}`,
        },
      ],
      max_tokens: 400,
    });

    const summary = completion.choices[0]?.message?.content || 'Could not generate summary.';
    res.status(200).json({ summary });
  } catch (error: any) {
    console.error('AI DM summary error:', error?.message);
    res.status(500).json({ error: 'AI is currently unavailable. Please try again later.' });
  }
};

// ── Whiteboard summary ───────────────────────────────────────────
export const summarizeWhiteboard = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { elements } = req.body as {
      elements: Array<{ type: string; text?: string; width?: number; height?: number }>;
    };

    if (!elements || elements.length === 0) {
      res.status(400).json({ error: 'Whiteboard is empty. Draw something first.' });
      return;
    }

    const description = describeWhiteboardElements(elements);

    const completion = await getClient().chat.completions.create({
      model: getModel(),
      messages: [
        {
          role: 'system',
          content:
            'You are a study session summarizer. Given a description of a whiteboard drawing from a study session, ' +
            'produce a concise bullet-point summary highlighting: the main topics/concepts drawn, ' +
            'key diagrams and their meaning, relationships between elements, and any conclusions. Be brief and useful.',
        },
        {
          role: 'user',
          content: `Summarize this study session whiteboard:\n\n${description}`,
        },
      ],
      max_tokens: 500,
    });

    const summary = completion.choices[0]?.message?.content || 'Could not generate whiteboard summary.';
    res.status(200).json({ summary });
  } catch (error: any) {
    console.error('AI whiteboard summary error:', error?.message);
    res.status(500).json({ error: 'AI is currently unavailable. Please try again later.' });
  }
};

// ── Embedding helpers ───────────────────────────────────────────

export async function generateEmbedding(text: string): Promise<number[]> {
  const today = new Date().toISOString().slice(0, 10);
  const newCount = await incrementEmbeddingCount(today);
  if (newCount > RATE_LIMIT_CONFIG.EMBEDDING_DAILY_MAX) {
    throw new Error('Daily embedding limit reached. Please try again tomorrow.');
  }

  const response = await getClient().embeddings.create({
    model: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
    input: text.slice(0, 2048),
  });
  return response.data[0].embedding;
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ── Summary Q&A (RAG) ──────────────────────────────────────────

export const querySummaries = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { question } = req.body as { question: string };
    const userId = req.user?.userId;

    if (!question || question.trim().length === 0) {
      res.status(400).json({ error: 'Question is required' });
      return;
    }

    // Fetch all user summaries that have embeddings
    const summaries = await Summary.find({
      userId,
      'embedding.0': { $exists: true },
    }).select('title type contextLabel content embedding createdAt');

    if (summaries.length === 0) {
      res.status(200).json({
        answer: "You don't have any summaries yet. Save some session summaries first, then come back to ask questions about them!",
        sources: [],
      });
      return;
    }

    // Embed the question
    let questionEmbedding: number[];
    try {
      questionEmbedding = await generateEmbedding(question.trim());
    } catch (err: any) {
      if (err.message?.includes('Daily embedding limit')) {
        res.status(429).json({ error: err.message });
      } else {
        res.status(500).json({ error: 'Failed to process your question. Please try again.' });
      }
      return;
    }

    // Compute similarity and rank
    const scored = summaries.map((s) => ({
      doc: s,
      score: cosineSimilarity(questionEmbedding, s.embedding as number[]),
    }));
    scored.sort((a, b) => b.score - a.score);

    // Take top 5
    const topK = scored.slice(0, 5);

    // Build context for the AI
    const context = topK
      .map((item, i) => {
        const date = new Date(item.doc.createdAt).toLocaleDateString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
        const content = item.doc.content.length > 1000
          ? item.doc.content.slice(0, 1000) + '...'
          : item.doc.content;
        return `--- Summary ${i + 1} ---\nType: ${item.doc.type}\nTitle: ${item.doc.title}\nDate: ${date}\nContext: ${item.doc.contextLabel || 'N/A'}\nContent:\n${content}`;
      })
      .join('\n\n');

    const completion = await getClient().chat.completions.create({
      model: getModel(),
      messages: [
        {
          role: 'system',
          content:
            'You are a study assistant with access to the user\'s saved session summaries. ' +
            'Answer their question based ONLY on the provided summaries. ' +
            'If the answer is not found in any summary, say so honestly. ' +
            'Always cite which summary title and date your answer comes from. ' +
            'Format your answer with bullet points for clarity.',
        },
        {
          role: 'user',
          content: `Here are my saved study summaries:\n\n${context}\n\n---\n\nMy question: ${question.trim()}`,
        },
      ],
      max_tokens: 800,
    });

    const answer = completion.choices[0]?.message?.content || 'Sorry, I could not generate an answer.';

    const sources = topK.map((item) => ({
      _id: item.doc._id,
      title: item.doc.title,
      type: item.doc.type,
      createdAt: item.doc.createdAt,
      score: Math.round(item.score * 100) / 100,
    }));

    res.status(200).json({ answer, sources });
  } catch (error: any) {
    console.error('Summary Q&A error:', error?.message);
    res.status(500).json({ error: 'AI is currently unavailable. Please try again later.' });
  }
};
