import { Router } from 'express';
import { MarksController } from './marks.controller';
import { verifyToken, requireRole } from '../../middlewares/authMiddleware';
import { scopeDepartment } from '../../core/middleware/scopeDepartment';
import { UserRole } from '../../models/User';
import { validate } from '../../core/middleware/validate';
import { asyncHandler } from '../../core/middleware/asyncHandler';
import {
  submitMarksSchema,
  bulkSubmitMarksSchema,
  listMarksQuerySchema,
} from './marks.validator';

const router = Router();

router.post(
  '/',
  verifyToken,
  requireRole([UserRole.FACULTY, UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.SUPERVISOR]),
  validate(submitMarksSchema, 'body'),
  asyncHandler(MarksController.submit)
);

router.post(
  '/bulk',
  verifyToken,
  requireRole([UserRole.FACULTY, UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.SUPERVISOR]),
  validate(bulkSubmitMarksSchema, 'body'),
  asyncHandler(MarksController.bulkSubmit)
);

router.get(
  '/',
  verifyToken,
  requireRole([UserRole.FACULTY, UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.HOD, UserRole.SUPERVISOR]),
  scopeDepartment,
  validate(listMarksQuerySchema, 'query'),
  asyncHandler(MarksController.list)
);

router.get(
  '/exam/:examId',
  verifyToken,
  requireRole([UserRole.FACULTY, UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.HOD, UserRole.SUPERVISOR]),
  asyncHandler(MarksController.getMarksByExam)
);

router.get(
  '/summary/:examId',
  verifyToken,
  asyncHandler(MarksController.getMarksSummary)
);

router.get(
  '/student/:studentId',
  verifyToken,
  asyncHandler(MarksController.getStudentMarks)
);

router.delete(
  '/:id',
  verifyToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.SUPERVISOR]),
  asyncHandler(MarksController.delete)
);

export default router;
