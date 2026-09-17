import { Request, Response, NextFunction } from 'express';
import admin from '../config/firebase';
import User, { UserRole } from '../models/User';
import { setRequestContextUser } from '../core/middleware/requestContext';
import { cacheGet, cacheSet } from '../config/redis';

export interface AuthRequest extends Request {
  user?: any; // The authenticated user from DB
  firebaseUser?: admin.auth.DecodedIdToken;
}

export const verifyToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  const token = req.headers.authorization?.split('Bearer ')[1];

  if (!token) {
    res.status(401).json({ message: 'No token provided' });
    return;
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.firebaseUser = decodedToken;
    
    // Check if custom claims are already set to avoid DB trip
    const isValidDept = !decodedToken.department || /^[a-fA-F0-9]{24}$/.test(decodedToken.department);
    
    if (decodedToken.mongoUserId && decodedToken.roles && isValidDept) {
      req.user = {
        _id: decodedToken.mongoUserId,
        email: decodedToken.email as string,
        roles: decodedToken.roles,
        department: decodedToken.department,
        studentId: decodedToken.studentId,
        batch: decodedToken.batch,
        teacherInitial: decodedToken.teacherInitial,
      };
      setRequestContextUser(req.user._id, req.user.roles);
      return next();
    }

    // Optimization: check Redis cache for claims during the 1hr token transition window
    const cacheKey = `user:claims:${decodedToken.uid}`;
    const cachedClaims = await cacheGet(cacheKey);
    if (cachedClaims) {
      req.user = {
        ...cachedClaims,
        _id: cachedClaims.mongoUserId,
        email: decodedToken.email as string,
      };
      setRequestContextUser(req.user._id, req.user.roles);
      return next();
    }

    // Fallback: Check if user exists in our DB by email
    const user = await User.findOne({ email: decodedToken.email })
      .select('email roles department studentId batch teacherInitial')
      .lean();
    
    if (!user) {
      res.status(403).json({ message: 'Access Denied: Email not assigned' });
      return;
    }

    // Set custom claims asynchronously for future requests
    const claims = {
      mongoUserId: user._id.toString(),
      roles: user.roles,
      department: user.department || '',
      studentId: user.studentId || '',
      batch: user.batch || '',
      teacherInitial: user.teacherInitial || ''
    };
    await admin.auth().setCustomUserClaims(decodedToken.uid, claims);
    await cacheSet(cacheKey, claims, 600); // Cache for 10 minutes

    req.user = {
      ...claims,
      _id: claims.mongoUserId,
      email: user.email,
    };
    setRequestContextUser(req.user._id, req.user.roles);
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token', error });
  }
};


export const isAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user && req.user.roles && (
    req.user.roles.includes(UserRole.ADMIN) || req.user.roles.includes(UserRole.SUPERADMIN)
  )) {
    next();
  } else {
    res.status(403).json({ message: 'Admin access required' });
  }
};

export const isSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user && req.user.roles && req.user.roles.includes(UserRole.SUPERADMIN)) {
    next();
  } else {
    res.status(403).json({ message: 'Superadmin access required' });
  }
};

export const isAdminOrHOD = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user && req.user.roles && (
    req.user.roles.includes(UserRole.ADMIN) || 
    req.user.roles.includes(UserRole.SUPERADMIN) ||
    req.user.roles.includes(UserRole.HOD)
  )) {
    next();
  } else {
    res.status(403).json({ message: 'Admin or HOD access required' });
  }
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (req.user && req.user.roles && req.user.roles.some((r: string) => allowedRoles.includes(r as UserRole))) {
      next();
    } else {
      res.status(403).json({ message: `Access denied. Requires one of roles: ${allowedRoles.join(', ')}` });
    }
  };
};

