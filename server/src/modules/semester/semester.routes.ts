import { Router } from 'express';
import { SemesterController } from './semester.controller';
import { verifyToken, isAdmin } from '../../middlewares/authMiddleware';
import { scopeDepartment } from '../../core/middleware/scopeDepartment';
import { validate } from '../../core/middleware/validate';
import { asyncHandler } from '../../core/middleware/asyncHandler';
import {
  createSemesterSchema,
  updateSemesterSchema,
  listSemestersQuerySchema,
} from './semester.validator';

const router = Router();

router.post(
  '/',
  verifyToken,
  isAdmin,
  validate(createSemesterSchema, 'body'),
  asyncHandler(SemesterController.create)
);

router.put(
  '/:id',
  verifyToken,
  isAdmin,
  validate(updateSemesterSchema, 'body'),
  asyncHandler(SemesterController.update)
);

router.get(
  '/active',
  verifyToken,
  asyncHandler(SemesterController.getActiveSemester)
);

router.get(
  '/',
  verifyToken,
  scopeDepartment,
  validate(listSemestersQuerySchema, 'query'),
  asyncHandler(SemesterController.list)
);

router.get(
  '/:id',
  verifyToken,
  asyncHandler(SemesterController.findById)
);

router.delete(
  '/:id',
  verifyToken,
  isAdmin,
  asyncHandler(SemesterController.delete)
);

export default router;
