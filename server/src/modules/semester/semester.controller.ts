import { Response } from 'express';
import { SemesterService } from './semester.service';
import { sendSuccess } from '../../core/types/response';

const service = new SemesterService();

export class SemesterController {
  static create = async (req: any, res: Response) => {
    const semester = await service.create(req.body);
    sendSuccess(res, semester, undefined, 201);
  };

  static update = async (req: any, res: Response) => {
    const semester = await service.update(req.params.id, req.body);
    sendSuccess(res, semester);
  };

  static findById = async (req: any, res: Response) => {
    const semester = await service.findById(req.params.id);
    sendSuccess(res, semester);
  };

  static getActiveSemester = async (_req: any, res: Response) => {
    const semester = await service.getActiveSemester();
    sendSuccess(res, semester);
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
