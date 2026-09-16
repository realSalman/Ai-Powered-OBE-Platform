import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  meta?: PaginationMeta,
  statusCode = 200
) => {
  res.status(statusCode).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
};
