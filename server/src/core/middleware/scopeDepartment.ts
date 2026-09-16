import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/authMiddleware';
import { UserRole } from '../../models/User';
import { DepartmentModel } from '../../modules/department/department.model';
import mongoose from 'mongoose';

/**
 * Middleware that sets `req.departmentScope` based on the user's role:
 * - superadmin → null (no filter, sees everything)
 * - admin/HOD/faculty/others → their department ObjectId (scoped)
 *
 * Must be placed AFTER verifyToken in the middleware chain.
 */
export const scopeDepartment = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    const roles: string[] = req.user.roles || [];

    if (roles.includes(UserRole.SUPERADMIN)) {
      // Superadmin sees everything — no department filter
      (req as any).departmentScope = null;
      return next();
    }

    // All other roles get scoped to their assigned department
    const dept = req.user.department;
    if (!dept) {
      res.status(403).json({ message: 'User has no department assigned. Contact a superadmin.' });
      return;
    }

    let departmentId: string | null = null;
    const deptStr = dept.toString().trim();

    if (mongoose.Types.ObjectId.isValid(deptStr)) {
      departmentId = deptStr;
    } else {
      // If it's a string (like "Computer Science & Engineering" or "CSE"), look it up
      const foundDept = await DepartmentModel.findOne({
        $or: [
          { code: { $regex: new RegExp(`^${deptStr}$`, 'i') } },
          { name: { $regex: new RegExp(`^${deptStr}$`, 'i') } },
          { name: { $regex: new RegExp(deptStr, 'i') } } // Fallback to partial match
        ]
      }).lean();
      
      if (foundDept) {
        departmentId = (foundDept._id as any).toString();
      }
    }

    if (!departmentId) {
      res.status(403).json({ message: `Invalid department '${deptStr}' assigned. Contact a superadmin.` });
      return;
    }

    (req as any).departmentScope = departmentId;
    return next();
  } catch (error) {
    next(error);
  }
};

