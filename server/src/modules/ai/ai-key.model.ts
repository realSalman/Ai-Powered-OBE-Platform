import mongoose, { Schema, Model } from 'mongoose';
import { IAIKey } from './ai.types';
import { env } from '../../config/env';

const aiKeySchema = new Schema<IAIKey>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  encryptedKey: { type: String, required: true },
  iv: { type: String, required: true },
  authTag: { type: String, required: true },
  provider: { type: String, default: 'openrouter' },
  isValid: { type: Boolean, default: true },
  lastValidated: { type: Date },
  preferredModel: { type: String, default: env.AI_DEFAULT_MODEL },
}, { timestamps: true });

export const AIKeyModel: Model<IAIKey> = mongoose.model<IAIKey>('AIKey', aiKeySchema);
