import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/middleware';
import OpenAI from 'openai';

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
