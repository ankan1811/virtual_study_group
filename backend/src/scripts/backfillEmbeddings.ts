/**
 * One-time migration script: Generate embeddings for existing summaries.
 *
 * Usage:
 *   cd backend
 *   npx ts-node src/scripts/backfillEmbeddings.ts
 *
 * Respects the daily embedding cap and adds a 1-second delay between calls
 * to stay within Gemini free tier rate limits.
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '../../.env') });

import mongoose from 'mongoose';
import Summary from '../models/Summary';
import { generateEmbedding } from '../controllers/AiController';

const DELAY_MS = 1000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is not set');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const summaries = await Summary.find({
    $or: [
      { embedding: { $exists: false } },
      { embedding: { $size: 0 } },
    ],
  }).select('_id title content');

  console.log(`Found ${summaries.length} summaries without embeddings`);

  let success = 0;
  let failed = 0;

  for (const summary of summaries) {
    try {
      const text = `${summary.title} ${summary.content}`;
      const embedding = await generateEmbedding(text);
      await Summary.updateOne({ _id: summary._id }, { $set: { embedding } });
      success++;
      console.log(`[${success + failed}/${summaries.length}] Embedded: ${summary.title}`);
    } catch (err: any) {
      failed++;
      console.error(`[${success + failed}/${summaries.length}] Failed: ${summary.title} — ${err?.message}`);
      if (err?.message?.includes('Daily embedding limit')) {
        console.error('Daily limit reached. Re-run this script tomorrow to continue.');
        break;
      }
    }
    await sleep(DELAY_MS);
  }

  console.log(`\nDone: ${success} embedded, ${failed} failed`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
