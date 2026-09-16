import crypto from 'crypto';
import axios from 'axios';
import { AIKeyModel } from './ai-key.model';
import { env } from '../../config/env';
import { logger } from '../../core/utils/logger';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes for GCM
const OPENROUTER_AUTH_URL = 'https://openrouter.ai/api/v1/auth/key';

export class AIKeyService {
  /**
   * Get the encryption secret buffer. Throws if not configured.
   */
  private static getSecretBuffer(): Buffer {
    const secret = env.AI_ENCRYPTION_SECRET;
    if (!secret) {
      throw new Error('AI_ENCRYPTION_SECRET is not configured in environment variables');
    }
    return Buffer.from(secret, 'hex');
  }

  /**
   * Encrypt a plaintext API key using AES-256-GCM.
   */
  private static encrypt(plaintext: string): { encryptedKey: string; iv: string; authTag: string } {
    const key = this.getSecretBuffer();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    return {
      encryptedKey: encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
    };
  }

  /**
   * Decrypt an encrypted API key.
   */
  private static decrypt(encryptedKey: string, ivHex: string, authTagHex: string): string {
    const key = this.getSecretBuffer();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedKey, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Save (upsert) a user's encrypted API key.
   */
  static async saveKey(userId: string, plaintextKey: string): Promise<void> {
    const trimmedKey = plaintextKey.trim();
    const { encryptedKey, iv, authTag } = this.encrypt(trimmedKey);

    await AIKeyModel.findOneAndUpdate(
      { user: userId },
      {
        $set: {
          encryptedKey,
          iv,
          authTag,
          isValid: true,
          lastValidated: new Date(),
        },
      },
      { upsert: true, new: true }
    );
  }

  /**
   * Decrypt and return a user's API key. Returns null if no key stored.
   */
  static async getDecryptedKey(userId: string): Promise<string | null> {
    const record = await AIKeyModel.findOne({ user: userId }).lean();
    if (!record) {
      return env.OPENROUTER_API_KEY || null;
    }

    try {
      return this.decrypt(record.encryptedKey, record.iv, record.authTag);
    } catch (err) {
      logger.error(err, 'Failed to decrypt API key for user');
      return env.OPENROUTER_API_KEY || null;
    }
  }

  /**
   * Validate a plaintext key against OpenRouter's auth endpoint.
   */
  static async validateKey(plaintextKey: string): Promise<{ valid: boolean; label?: string; error?: string }> {
    const trimmedKey = plaintextKey.trim();
    try {
      const response = await axios.get(OPENROUTER_AUTH_URL, {
        headers: { Authorization: `Bearer ${trimmedKey}` },
        timeout: 10000,
      });

      const data = response.data?.data;
      return {
        valid: true,
        label: data?.label || 'Active',
      };
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        return { valid: false, error: 'The API key is invalid or has expired.' };
      }
      // Network errors — assume key might be valid, but can't verify
      logger.warn(err, 'Could not reach OpenRouter to validate key');
      return { valid: true, label: 'Unverified (network error)' };
    }
  }

  /**
   * Delete user's stored key.
   */
  static async deleteKey(userId: string): Promise<void> {
    await AIKeyModel.deleteOne({ user: userId });
  }

  /**
   * Check if user has a key stored (without decrypting).
   */
  static async hasKey(userId: string): Promise<boolean> {
    const count = await AIKeyModel.countDocuments({ user: userId });
    return count > 0 || !!env.OPENROUTER_API_KEY;
  }

  /**
   * Get key status for UI display (no plaintext).
   */
  static async getKeyStatus(userId: string): Promise<{
    hasKey: boolean;
    isValid: boolean;
    preferredModel: string;
    lastValidated?: Date;
  }> {
    const record = await AIKeyModel.findOne({ user: userId }).lean();
    if (!record) {
      const systemKeyExists = !!env.OPENROUTER_API_KEY;
      return {
        hasKey: systemKeyExists,
        isValid: systemKeyExists,
        preferredModel: env.AI_DEFAULT_MODEL,
      };
    }

    return {
      hasKey: true,
      isValid: record.isValid,
      preferredModel: record.preferredModel,
      lastValidated: record.lastValidated,
    };
  }

  /**
   * Update user's preferred model.
   */
  static async updatePreferredModel(userId: string, model: string): Promise<void> {
    await AIKeyModel.findOneAndUpdate(
      { user: userId },
      { $set: { preferredModel: model } }
    );
  }
}
