import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): any => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Mongoose Duplicate Key Error (MongoDB Code 11000)
  if (err.name === 'MongoServerError' && err.code === 11000) {
    return res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_KEY',
        message: 'Resource already exists',
        details: err.keyValue,
      },
    });
  }

  // Mongoose Cast Error (Invalid ID format, etc.)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'CAST_ERROR',
        message: `Invalid format for field ${err.path}`,
        details: {
          value: err.value,
          path: err.path,
        },
      },
    });
  }

  // Log unhandled exceptions
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error in request');

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
};
