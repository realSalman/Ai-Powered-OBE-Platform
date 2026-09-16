import { Router } from 'express';
import { DepartmentController } from './department.controller';
import { verifyToken, isAdmin, isSuperAdmin } from '../../middlewares/authMiddleware';
import { scopeDepartment } from '../../core/middleware/scopeDepartment';
import { validate } from '../../core/middleware/validate';
import { asyncHandler } from '../../core/middleware/asyncHandler';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  listDepartmentsQuerySchema,
} from './department.validator';

const router = Router();

router.post(
  '/',
  verifyToken,
  isSuperAdmin,
  validate(createDepartmentSchema, 'body'),
  asyncHandler(DepartmentController.create)
);

router.put(
  '/:id',
  verifyToken,
  isAdmin,
  validate(updateDepartmentSchema, 'body'),
  asyncHandler(DepartmentController.update)
);

router.get(
  '/',
  verifyToken,
  scopeDepartment,
  validate(listDepartmentsQuerySchema, 'query'),
  asyncHandler(DepartmentController.list)
);

router.get(
  '/:id',
  verifyToken,
  asyncHandler(DepartmentController.findById)
);

router.delete(
  '/:id',
  verifyToken,
  isSuperAdmin,
  asyncHandler(DepartmentController.delete)
);

export default router;
