import { Router } from 'express';
import { CourseOfferingController } from './offering.controller';
import { verifyToken, isAdmin, isAdminOrHOD, requireRole } from '../../middlewares/authMiddleware';
import { scopeDepartment } from '../../core/middleware/scopeDepartment';
import { UserRole } from '../../models/User';
import { validate } from '../../core/middleware/validate';
import { asyncHandler } from '../../core/middleware/asyncHandler';
import {
  createOfferingSchema,
  bulkCreateOfferingSchema,
  updateOfferingSchema,
  listOfferingsQuerySchema,
} from './offering.validator';

const router = Router();

router.post(
  '/',
  verifyToken,
  isAdminOrHOD,
  validate(createOfferingSchema, 'body'),
  asyncHandler(CourseOfferingController.create)
);

router.post(
  '/bulk',
  verifyToken,
  isAdminOrHOD,
  validate(bulkCreateOfferingSchema, 'body'),
  asyncHandler(CourseOfferingController.bulkCreate)
);

router.put(
  '/:id',
  verifyToken,
  isAdminOrHOD,
  validate(updateOfferingSchema, 'body'),
  asyncHandler(CourseOfferingController.update)
);

// Faculty: get my own offerings (must be before /:id)
router.get(
  '/me',
  verifyToken,
  requireRole([UserRole.FACULTY, UserRole.HOD, UserRole.SUPERVISOR]),
  asyncHandler(CourseOfferingController.getMyOfferings)
);

router.get(
  '/',
  verifyToken,
  isAdminOrHOD,
  scopeDepartment,
  validate(listOfferingsQuerySchema, 'query'),
  asyncHandler(CourseOfferingController.list)
);

router.get(
  '/:id',
  verifyToken,
  asyncHandler(CourseOfferingController.findById)
);

router.delete(
  '/:id',
  verifyToken,
  isAdminOrHOD,
  asyncHandler(CourseOfferingController.delete)
);

export default router;
