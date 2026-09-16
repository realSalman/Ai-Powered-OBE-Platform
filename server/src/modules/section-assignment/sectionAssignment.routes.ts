import { Router } from 'express';
import { SectionAssignmentController } from './sectionAssignment.controller';
import { verifyToken, requireRole, isAdmin } from '../../middlewares/authMiddleware';
import { scopeDepartment } from '../../core/middleware/scopeDepartment';
import { UserRole } from '../../models/User';
import { validate } from '../../core/middleware/validate';
import { asyncHandler } from '../../core/middleware/asyncHandler';
import {
  createSectionAssignmentSchema,
  bulkSectionAssignmentSchema,
  listSectionAssignmentsQuerySchema,
} from './sectionAssignment.validator';

const router = Router();

router.post(
  '/',
  verifyToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.SUPERVISOR]),
  validate(createSectionAssignmentSchema, 'body'),
  asyncHandler(SectionAssignmentController.create)
);

router.post(
  '/bulk',
  verifyToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.SUPERVISOR]),
  validate(bulkSectionAssignmentSchema, 'body'),
  asyncHandler(SectionAssignmentController.bulkAssign)
);

router.get(
  '/me',
  verifyToken,
  requireRole([UserRole.FACULTY, UserRole.HOD, UserRole.SUPERVISOR]),
  asyncHandler(SectionAssignmentController.getMySections)
);

router.get(
  '/',
  verifyToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.HOD, UserRole.SUPERVISOR]),
  scopeDepartment,
  validate(listSectionAssignmentsQuerySchema, 'query'),
  asyncHandler(SectionAssignmentController.list)
);

router.get(
  '/:id',
  verifyToken,
  asyncHandler(SectionAssignmentController.findById)
);

router.delete(
  '/:id',
  verifyToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.SUPERVISOR]),
  asyncHandler(SectionAssignmentController.delete)
);

export default router;
