import { Router } from 'express';
import { CourseController } from './course.controller';
import { verifyToken, isAdmin, isAdminOrHOD } from '../../middlewares/authMiddleware';
import { scopeDepartment } from '../../core/middleware/scopeDepartment';
import { validate } from '../../core/middleware/validate';
import { asyncHandler } from '../../core/middleware/asyncHandler';
import {
  createCourseSchema,
  updateCourseSchema,
  listCoursesQuerySchema,
} from './course.validator';

const router = Router();

router.post(
  '/',
  verifyToken,
  isAdmin,
  validate(createCourseSchema, 'body'),
  asyncHandler(CourseController.create)
);

router.put(
  '/:id',
  verifyToken,
  isAdminOrHOD,
  validate(updateCourseSchema, 'body'),
  asyncHandler(CourseController.update)
);

router.get(
  '/:id/matrix',
  verifyToken,
  asyncHandler(CourseController.getCoPoMatrix)
);

router.get(
  '/',
  verifyToken,
  isAdminOrHOD,
  scopeDepartment,
  validate(listCoursesQuerySchema, 'query'),
  asyncHandler(CourseController.list)
);

router.get(
  '/:id',
  verifyToken,
  asyncHandler(CourseController.findById)
);

router.delete(
  '/:id',
  verifyToken,
  isAdmin,
  asyncHandler(CourseController.delete)
);

export default router;
