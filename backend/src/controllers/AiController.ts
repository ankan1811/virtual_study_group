import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/middleware';
import OpenAI from 'openai';

const grok = new OpenAI({
  apiKey: process.env.GROK_API_KEY || '',
  baseURL: 'https://api.x.ai/v1',
});

export const askDoubt = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { question } = req.body as { question: string };

    if (!question || question.trim().length === 0) {
      res.status(400).json({ error: 'Question is required' });
      return;
    }

    const completion = await grok.chat.completions.create({
      model: 'grok-3-mini',
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
    console.error('Grok API error:', error?.message);
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

    const completion = await grok.chat.completions.create({
      model: 'grok-3-mini',
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
    console.error('Grok API error:', error?.message);
    res.status(500).json({ error: 'AI is currently unavailable. Please try again later.' });
  }
};
