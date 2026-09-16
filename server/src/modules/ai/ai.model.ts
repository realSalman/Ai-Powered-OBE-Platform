import mongoose, { Schema, Model } from 'mongoose';
import { IAIChat } from './ai.types';
import { env } from '../../config/env';

const messageSchema = new Schema({
  role: { type: String, enum: ['system', 'user', 'assistant', 'tool'], required: true },
  content: { type: String, default: '' },
  name: { type: String },
  tool_call_id: { type: String },
  tool_calls: { type: Schema.Types.Mixed },
}, { _id: false });

const aiChatSchema = new Schema<IAIChat>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, default: 'New Chat' },
  aiModel: { type: String, default: env.AI_DEFAULT_MODEL },
  role: { type: String, required: true },
  messages: { type: [messageSchema], default: [] },
}, { timestamps: true });

// Indexes
aiChatSchema.index({ user: 1, updatedAt: -1 });
// Auto-cleanup chats after 30 days
aiChatSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const AIChatModel: Model<IAIChat> = mongoose.model<IAIChat>('AIChat', aiChatSchema);
