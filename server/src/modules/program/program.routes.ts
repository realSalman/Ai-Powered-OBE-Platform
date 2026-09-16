import { Router } from 'express';
import { ProgramController } from './program.controller';
import { verifyToken, isAdmin, isAdminOrHOD } from '../../middlewares/authMiddleware';
import { scopeDepartment } from '../../core/middleware/scopeDepartment';
import { validate } from '../../core/middleware/validate';
import { asyncHandler } from '../../core/middleware/asyncHandler';
import {
  createProgramSchema,
  updateProgramSchema,
  listProgramsQuerySchema,
} from './program.validator';

const router = Router();

router.post(
  '/',
  verifyToken,
  isAdmin,
  validate(createProgramSchema, 'body'),
  asyncHandler(ProgramController.create)
);

router.put(
  '/:id',
  verifyToken,
  isAdminOrHOD,
  validate(updateProgramSchema, 'body'),
  asyncHandler(ProgramController.update)
);

router.get(
  '/',
  verifyToken,
  isAdminOrHOD,
  scopeDepartment,
  validate(listProgramsQuerySchema, 'query'),
  asyncHandler(ProgramController.list)
);

router.get(
  '/:id',
  verifyToken,
  asyncHandler(ProgramController.findById)
);

router.delete(
  '/:id',
  verifyToken,
  isAdmin,
  asyncHandler(ProgramController.delete)
);

export default router;
