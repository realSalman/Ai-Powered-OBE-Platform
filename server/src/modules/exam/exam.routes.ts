import { Router } from 'express';
import { ExamController } from './exam.controller';
import { verifyToken, requireRole, isAdmin } from '../../middlewares/authMiddleware';
import { scopeDepartment } from '../../core/middleware/scopeDepartment';
import { UserRole } from '../../models/User';
import { validate } from '../../core/middleware/validate';
import { asyncHandler } from '../../core/middleware/asyncHandler';
import {
  createExamSchema,
  updateExamSchema,
  listExamsQuerySchema,
} from './exam.validator';

const router = Router();

router.post(
  '/',
  verifyToken,
  requireRole([UserRole.FACULTY]),
  validate(createExamSchema, 'body'),
  asyncHandler(ExamController.create)
);

router.put(
  '/:id',
  verifyToken,
  requireRole([UserRole.FACULTY]),
  validate(updateExamSchema, 'body'),
  asyncHandler(ExamController.update)
);

router.get(
  '/',
  verifyToken,
  scopeDepartment,
  validate(listExamsQuerySchema, 'query'),
  asyncHandler(ExamController.list)
);

router.get(
  '/:id',
  verifyToken,
  asyncHandler(ExamController.findById)
);

router.delete(
  '/:id',
  verifyToken,
  requireRole([UserRole.FACULTY]),
  asyncHandler(ExamController.delete)
);

export default router;
