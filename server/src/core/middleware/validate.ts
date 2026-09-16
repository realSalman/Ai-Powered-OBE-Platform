import { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';
import { ValidationError } from '../errors';

export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      throw new ValidationError(result.error.flatten().fieldErrors);
    }
    
    Object.defineProperty(req, source, {
      value: result.data,
      writable: true,
      enumerable: true,
      configurable: true
    });
    
    next();
  };
};
