import { Router } from 'express';
import { AttainmentController } from './attainment.controller';
import { verifyToken, requireRole } from '../../middlewares/authMiddleware';
import { scopeDepartment } from '../../core/middleware/scopeDepartment';
import { UserRole } from '../../models/User';
import { validate } from '../../core/middleware/validate';
import { asyncHandler } from '../../core/middleware/asyncHandler';
import { saveConfigSchema } from './attainment-config.validator';

const router = Router();

router.get(
  '/config',
  verifyToken,
  requireRole([UserRole.HOD, UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.SUPERVISOR, UserRole.FACULTY, UserRole.STUDENT]),
  scopeDepartment,
  asyncHandler(AttainmentController.getConfig)
);

router.put(
  '/config',
  verifyToken,
  requireRole([UserRole.HOD, UserRole.ADMIN, UserRole.SUPERADMIN]),
  scopeDepartment,
  validate(saveConfigSchema, 'body'),
  asyncHandler(AttainmentController.saveConfig)
);

router.get(
  '/exam/:examId',
  verifyToken,
  requireRole([UserRole.FACULTY, UserRole.HOD, UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.SUPERVISOR]),
  asyncHandler(AttainmentController.examAttainment)
);

router.get(
  '/offering/:offeringId',
  verifyToken,
  requireRole([UserRole.FACULTY, UserRole.HOD, UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.SUPERVISOR]),
  asyncHandler(AttainmentController.offeringAttainment)
);

router.get(
  '/offering/:offeringId/po',
  verifyToken,
  requireRole([UserRole.FACULTY, UserRole.HOD, UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.SUPERVISOR]),
  asyncHandler(AttainmentController.poAttainment)
);

router.get(
  '/batch/:batchId/:semesterId',
  verifyToken,
  requireRole([UserRole.HOD, UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.SUPERVISOR]),
  asyncHandler(AttainmentController.batchAttainment)
);

router.get(
  '/department/:deptId/:semesterId',
  verifyToken,
  requireRole([UserRole.HOD, UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.SUPERVISOR]),
  asyncHandler(AttainmentController.deptAttainment)
);

export default router;
