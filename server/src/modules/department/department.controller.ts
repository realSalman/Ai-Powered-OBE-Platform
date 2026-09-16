import { Response } from 'express';
import { DepartmentService } from './department.service';
import { sendSuccess } from '../../core/types/response';

const service = new DepartmentService();

export class DepartmentController {
  static create = async (req: any, res: Response) => {
    const dept = await service.create(req.body);
    sendSuccess(res, dept, undefined, 201);
  };

  static update = async (req: any, res: Response) => {
    const dept = await service.update(req.params.id, req.body);
    sendSuccess(res, dept);
  };

  static findById = async (req: any, res: Response) => {
    const dept = await service.findById(req.params.id);
    sendSuccess(res, dept);
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
