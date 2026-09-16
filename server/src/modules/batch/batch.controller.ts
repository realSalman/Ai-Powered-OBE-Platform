import { Response } from 'express';
import { BatchService } from './batch.service';
import { sendSuccess } from '../../core/types/response';

const service = new BatchService();

export class BatchController {
  static create = async (req: any, res: Response) => {
    // Auto-inject department from scope if not explicitly provided
    if (req.departmentScope && !req.body.department) {
      req.body.department = req.departmentScope;
    }
    // Auto-derive name from code if not provided
    if (!req.body.name && req.body.code) {
      req.body.name = `Batch ${req.body.code}`;
    }
    const batch = await service.create(req.body);
    sendSuccess(res, batch, undefined, 201);
  };

  static update = async (req: any, res: Response) => {
    // Auto-inject department from scope if not explicitly provided
    if (req.departmentScope && !req.body.department) {
      req.body.department = req.departmentScope;
    }
    const batch = await service.update(req.params.id, req.body);
    sendSuccess(res, batch);
  };

  static findById = async (req: any, res: Response) => {
    const batch = await service.findById(req.params.id);
    sendSuccess(res, batch);
  };

  static list = async (req: any, res: Response) => {
    const result = await service.list(req.query, req.departmentScope);
    sendSuccess(res, result.data, result.meta);
  };

  static delete = async (req: any, res: Response) => {
    const result = await service.delete(req.params.id);
    sendSuccess(res, result);
  };
}
