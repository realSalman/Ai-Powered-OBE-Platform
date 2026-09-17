import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { getRequestId, getRequestUserId } from './requestContext';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/metrics' || req.path === '/favicon.ico') {
    return next();
  }

  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const statusCode = res.statusCode;
    const logData = {
      requestId: getRequestId(),
      userId: getRequestUserId(),
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode,
      durationMs,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    if (statusCode >= 500) {
      logger.error(logData, 'HTTP Request Server Error');
    } else if (statusCode >= 400) {
      logger.warn(logData, 'HTTP Request Client Error');
    } else {
      logger.info(logData, 'HTTP Request Completed');
    }
  });

  next();
};
