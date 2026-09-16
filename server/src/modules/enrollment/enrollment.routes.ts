import { Router } from 'express';
import { EnrollmentController } from './enrollment.controller';
import { verifyToken, requireRole, isAdmin } from '../../middlewares/authMiddleware';
import { scopeDepartment } from '../../core/middleware/scopeDepartment';
import { UserRole } from '../../models/User';
import { validate } from '../../core/middleware/validate';
import { asyncHandler } from '../../core/middleware/asyncHandler';
import {
  createEnrollmentSchema,
  bulkEnrollmentSchema,
  updateEnrollmentSchema,
  listEnrollmentsQuerySchema,
} from './enrollment.validator';

const router = Router();

router.post(
  '/',
  verifyToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.SUPERVISOR]),
  validate(createEnrollmentSchema, 'body'),
  asyncHandler(EnrollmentController.create)
);

router.post(
  '/bulk',
  verifyToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.SUPERVISOR]),
  validate(bulkEnrollmentSchema, 'body'),
  asyncHandler(EnrollmentController.bulkEnroll)
);

router.put(
  '/:id',
  verifyToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.SUPERVISOR]),
  validate(updateEnrollmentSchema, 'body'),
  asyncHandler(EnrollmentController.update)
);

router.get(
  '/me',
  verifyToken,
  requireRole([UserRole.STUDENT]),
  asyncHandler(EnrollmentController.getMyEnrollments)
);

router.get(
  '/',
  verifyToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.HOD, UserRole.SUPERVISOR, UserRole.FACULTY]),
  scopeDepartment,
  validate(listEnrollmentsQuerySchema, 'query'),
  asyncHandler(EnrollmentController.list)
);

router.get(
  '/:id',
  verifyToken,
  asyncHandler(EnrollmentController.findById)
);

router.delete(
  '/:id',
  verifyToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.SUPERVISOR]),
  asyncHandler(EnrollmentController.delete)
);

export default router;
