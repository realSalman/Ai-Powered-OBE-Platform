import { Router } from 'express';
import { BatchController } from './batch.controller';
import { verifyToken, isAdmin } from '../../middlewares/authMiddleware';
import { scopeDepartment } from '../../core/middleware/scopeDepartment';
import { validate } from '../../core/middleware/validate';
import { asyncHandler } from '../../core/middleware/asyncHandler';
import {
  createBatchSchema,
  updateBatchSchema,
  listBatchesQuerySchema,
} from './batch.validator';

const router = Router();

router.post(
  '/',
  verifyToken,
  isAdmin,
  scopeDepartment,
  validate(createBatchSchema, 'body'),
  asyncHandler(BatchController.create)
);

router.put(
  '/:id',
  verifyToken,
  isAdmin,
  scopeDepartment,
  validate(updateBatchSchema, 'body'),
  asyncHandler(BatchController.update)
);

router.get(
  '/',
  verifyToken,
  scopeDepartment,
  validate(listBatchesQuerySchema, 'query'),
  asyncHandler(BatchController.list)
);

router.get(
  '/:id',
  verifyToken,
  asyncHandler(BatchController.findById)
);

router.delete(
  '/:id',
  verifyToken,
  isAdmin,
  asyncHandler(BatchController.delete)
);

export default router;
