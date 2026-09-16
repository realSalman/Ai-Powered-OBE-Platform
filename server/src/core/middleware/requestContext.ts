import { AsyncLocalStorage } from 'async_hooks';
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../middlewares/authMiddleware';
import crypto from 'crypto';

interface RequestContext {
  userId: string;
  roles: string[];
  requestId: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export const contextMiddleware = (req: AuthRequest, _res: Response, next: NextFunction) => {
  const ctx: RequestContext = {
    userId: req.user?._id || 'system',
    roles: req.user?.roles || [],
    requestId: crypto.randomUUID(),
  };
  requestContext.run(ctx, next);
};

export const getRequestUserId = () => requestContext.getStore()?.userId || 'system';
export const getRequestRoles = () => requestContext.getStore()?.roles || [];
export const getRequestId = () => requestContext.getStore()?.requestId || 'unknown';
