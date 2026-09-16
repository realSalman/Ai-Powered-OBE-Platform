import { Router } from 'express';
import { AIController } from './ai.controller';
import { verifyToken } from '../../middlewares/authMiddleware';
import { scopeDepartment } from '../../core/middleware/scopeDepartment';
import { validate } from '../../core/middleware/validate';
import { asyncHandler } from '../../core/middleware/asyncHandler';
import {
  sendMessageSchema,
  quickAnalyzeSchema,
  saveApiKeySchema,
  validateApiKeySchema,
  updateModelSchema,
} from './ai.validator';

const router = Router();

// Chat endpoints
router.post(
  '/chat',
  verifyToken,
  scopeDepartment,
  validate(sendMessageSchema, 'body'),
  asyncHandler(AIController.sendMessage)
);

router.get(
  '/chats',
  verifyToken,
  asyncHandler(AIController.getChats)
);

router.delete(
  '/chats/:chatId',
  verifyToken,
  asyncHandler(AIController.deleteChat)
);

// Cached quick analysis
router.post(
  '/analyze',
  verifyToken,
  scopeDepartment,
  validate(quickAnalyzeSchema, 'body'),
  asyncHandler(AIController.quickAnalyze)
);

// API Key management
router.post(
  '/key',
  verifyToken,
  validate(saveApiKeySchema, 'body'),
  asyncHandler(AIController.saveApiKey)
);

router.get(
  '/key/status',
  verifyToken,
  asyncHandler(AIController.getKeyStatus)
);

router.delete(
  '/key',
  verifyToken,
  asyncHandler(AIController.deleteApiKey)
);

router.post(
  '/key/validate',
  verifyToken,
  validate(validateApiKeySchema, 'body'),
  asyncHandler(AIController.validateApiKey)
);

router.put(
  '/key/model',
  verifyToken,
  validate(updateModelSchema, 'body'),
  asyncHandler(AIController.updatePreferredModel)
);

export default router;
