import { Response } from 'express';
import { AIService } from './ai.service';
import { AIKeyService } from './ai-key.service';
import { AIChatModel } from './ai.model';
import { sendSuccess } from '../../core/types/response';
import { ForbiddenError, ValidationError } from '../../core/errors';

export class AIController {
  /**
   * Main chat endpoint with SSE streaming.
   */
  static sendMessage = async (req: any, res: Response) => {
    const userId = req.user._id.toString();
    const { message, chatId, model } = req.body;
    
    // Determine the role being used (must be in user's roles)
    let role = req.body.role || req.query.role;
    if (!role) {
      role = req.user.roles[0];
    }
    
    // Normalize role case-insensitively to match database (e.g. 'HOD' vs 'hod')
    const matchedRole = req.user.roles.find((r: string) => r.toLowerCase() === role.toLowerCase());
    if (!matchedRole) {
      throw new ForbiddenError(`Access Denied: You do not possess the role of ${role}`);
    }
    role = matchedRole;

    const departmentScope = req.departmentScope ? req.departmentScope.toString() : null;

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders(); // flush headers to start stream immediately

    try {
      await AIService.chat(
        {
          userId,
          chatId,
          message,
          model,
          role,
          departmentScope,
        },
        (chunk) => {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
      );
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ type: 'error', content: err.message || 'Stream processing failed' })}\n\n`);
    } finally {
      res.end();
    }
  };

  /**
   * List all chats for a user.
   */
  static getChats = async (req: any, res: Response) => {
    const userId = req.user._id.toString();
    const chats = await AIChatModel.find({ user: userId })
      .select('_id title aiModel role messages createdAt updatedAt')
      .sort({ updatedAt: -1 })
      .lean();
    sendSuccess(res, chats);
  };

  /**
   * Delete a chat.
   */
  static deleteChat = async (req: any, res: Response) => {
    const userId = req.user._id.toString();
    const chatId = req.params.chatId;

    const result = await AIChatModel.deleteOne({ _id: chatId, user: userId });
    if (result.deletedCount === 0) {
      throw new ValidationError({ chatId: 'Chat not found or already deleted' });
    }
    sendSuccess(res, { success: true });
  };

  /**
   * Single-turn quick analysis report (cached in Redis).
   */
  static quickAnalyze = async (req: any, res: Response) => {
    const userId = req.user._id.toString();
    const { type, scopeId, scopeType, semesterId } = req.body;

    let role = req.body.role || req.query.role;
    if (!role) {
      role = req.user.roles[0];
    }
    
    // Normalize role case-insensitively to match database (e.g. 'HOD' vs 'hod')
    const matchedRole = req.user.roles.find((r: string) => r.toLowerCase() === role.toLowerCase());
    if (!matchedRole) {
      throw new ForbiddenError(`Access Denied: You do not possess the role of ${role}`);
    }
    role = matchedRole;

    const departmentScope = req.departmentScope ? req.departmentScope.toString() : null;

    const report = await AIService.quickAnalyze({
      userId,
      type,
      scopeId,
      scopeType,
      role,
      departmentScope,
      semesterId,
    });

    sendSuccess(res, report);
  };

  /**
   * Save API Key.
   */
  static saveApiKey = async (req: any, res: Response) => {
    const userId = req.user._id.toString();
    const { apiKey } = req.body;

    // Validate key with OpenRouter before saving
    const validation = await AIKeyService.validateKey(apiKey);
    if (!validation.valid) {
      throw new ValidationError({ apiKey: validation.error || 'The provided OpenRouter API Key is invalid or expired.' });
    }

    await AIKeyService.saveKey(userId, apiKey);
    sendSuccess(res, { message: 'API key saved successfully', label: validation.label });
  };

  /**
   * Get API Key presence and details.
   */
  static getKeyStatus = async (req: any, res: Response) => {
    const userId = req.user._id.toString();
    const status = await AIKeyService.getKeyStatus(userId);
    sendSuccess(res, status);
  };

  /**
   * Delete API Key.
   */
  static deleteApiKey = async (req: any, res: Response) => {
    const userId = req.user._id.toString();
    await AIKeyService.deleteKey(userId);
    sendSuccess(res, { message: 'API key removed successfully' });
  };

  /**
   * Validate API Key without saving.
   */
  static validateApiKey = async (req: any, res: Response) => {
    const { apiKey } = req.body;
    const validation = await AIKeyService.validateKey(apiKey);
    sendSuccess(res, validation);
  };

  /**
   * Update preferred model config.
   */
  static updatePreferredModel = async (req: any, res: Response) => {
    const userId = req.user._id.toString();
    const { model } = req.body;
    await AIKeyService.updatePreferredModel(userId, model);
    sendSuccess(res, { message: 'Preferred model updated successfully' });
  };
}
