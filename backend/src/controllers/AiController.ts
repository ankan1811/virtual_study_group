import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/middleware';
import OpenAI from 'openai';
import DirectMessage from '../models/DirectMessage';

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

    const messages = await DirectMessage.find({
      $or: [
        { from: me, to: companionId },
        { from: companionId, to: me },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(100)
      .populate('from', 'name');

    if (!messages.length) {
      res.status(400).json({ error: 'No DM messages to summarize' });
      return;
    }

    const chatText = messages
      .map((m) => `${(m.from as any).name}: ${m.content}`)
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
