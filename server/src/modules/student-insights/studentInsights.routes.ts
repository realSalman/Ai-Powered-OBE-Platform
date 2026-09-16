import { Router } from 'express';
import { StudentInsightsController } from './studentInsights.controller';
import { verifyToken, requireRole } from '../../middlewares/authMiddleware';
import { UserRole } from '../../models/User';
import { asyncHandler } from '../../core/middleware/asyncHandler';

const router = Router();

// Cognitive Gap Analysis
router.get(
  '/gaps/:courseOfferingId',
  verifyToken,
  requireRole([UserRole.STUDENT]),
  asyncHandler(StudentInsightsController.analyzeGaps)
);

// Path to Pass Prediction
router.get(
  '/prediction/:courseOfferingId',
  verifyToken,
  requireRole([UserRole.STUDENT]),
  asyncHandler(StudentInsightsController.predictPath)
);

export default router;
