import { Router, Response } from 'express';
import { z } from 'zod';
import { verifyToken, AuthRequest, isAdmin, isAdminOrHOD, requireRole } from '../middlewares/authMiddleware';
import { scopeDepartment } from '../core/middleware/scopeDepartment';
import User, { UserRole } from '../models/User';
import { validate } from '../core/middleware/validate';
import { asyncHandler } from '../core/middleware/asyncHandler';
import { ConflictError } from '../core/errors';
import { sendSuccess } from '../core/types/response';

const router = Router();

export const createAdminUserSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  name: z.string().min(2).max(100).trim(),
  roles: z.array(z.nativeEnum(UserRole)).min(1),
  department: z.string().optional(),
  studentId: z.string().optional(),
  batch: z.string().optional(),
  teacherInitial: z.string().optional(),
}).refine(
  data => {
    // Superadmin cannot be assigned via API
    if (data.roles.includes(UserRole.SUPERADMIN)) return false;
    return true;
  },
  { message: 'Superadmin role cannot be assigned via API', path: ['roles'] }
).refine(
  data => {
    if (data.roles.includes(UserRole.STUDENT) && !data.studentId) return false;
    return true;
  },
  { message: 'studentId is required for student role', path: ['studentId'] }
).refine(
  data => {
    if (data.roles.includes(UserRole.FACULTY) && !data.teacherInitial) return false;
    return true;
  },
  { message: 'teacherInitial is required for faculty role', path: ['teacherInitial'] }
);

// Endpoint for admin to create/assign a new user
router.post(
  '/users',
  verifyToken,
  isAdmin,
  scopeDepartment,
  validate(createAdminUserSchema),
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { email, name, roles, department, studentId, batch, teacherInitial } = req.body;
    const departmentScope = (req as any).departmentScope;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Scoped admin must assign users to their own department
    const userDept = departmentScope || department;

    const newUser = new User({
      email,
      name,
      roles,
      department: userDept || undefined,
      studentId,
      batch,
      teacherInitial
    });

    await newUser.save();

    sendSuccess(res, newUser, undefined, 201);
  })
);

// GET /api/admin/users - list users, optionally filtered by role
router.get(
  '/users',
  verifyToken,
  requireRole([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.HOD, UserRole.SUPERVISOR]),
  scopeDepartment,
  asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { role } = req.query;
    const departmentScope = (req as any).departmentScope;
    const filter: any = {};
    if (role) {
      filter.roles = role;
    }
    // Scoped admin only sees users from their department
    if (departmentScope) {
      filter.department = departmentScope;
    }
    const users = await User.find(filter).sort({ name: 1 }).lean();
    sendSuccess(res, users);
  })
);

export default router;
