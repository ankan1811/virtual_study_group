import mongoose, { Schema, Document } from 'mongoose';
import { PodcastItem } from '../controllers/PodcastController';

export interface IPodcast extends Document {
  topic: string;
  podcasts: PodcastItem[];
  fetchedAt: Date;
  source: 'api' | 'mock';
}

const podcastSchema = new Schema<IPodcast>(
  {
    topic: { type: String, required: true },
    podcasts: { type: Schema.Types.Mixed, default: [] },
    fetchedAt: { type: Date, required: true },
    source: { type: String, enum: ['api', 'mock'], required: true },
  },
  { timestamps: false },
);

// One document per topic — upsert on every refresh
podcastSchema.index({ topic: 1 }, { unique: true });

// Auto-delete after 4 days if cron fails for an extended period
podcastSchema.index({ fetchedAt: 1 }, { expireAfterSeconds: 345600 });

export default mongoose.model<IPodcast>('Podcast', podcastSchema);
