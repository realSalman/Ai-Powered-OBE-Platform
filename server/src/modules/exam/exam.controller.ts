import { Response } from 'express';
import { ExamService } from './exam.service';
import { sendSuccess } from '../../core/types/response';

const service = new ExamService();

export class ExamController {
  static create = async (req: any, res: Response) => {
    const exam = await service.create(req.body, req.user._id);
    sendSuccess(res, exam, undefined, 201);
  };

  static update = async (req: any, res: Response) => {
    const exam = await service.update(req.params.id, req.body, req.user._id);
    sendSuccess(res, exam);
  };

  static findById = async (req: any, res: Response) => {
    const exam = await service.findById(req.params.id);
    sendSuccess(res, exam);
  };

  static list = async (req: any, res: Response) => {
    const result = await service.list(req.query, req.departmentScope, req.user);
    sendSuccess(res, result.data, result.meta);
  };

  static delete = async (req: any, res: Response) => {
    const result = await service.delete(req.params.id, req.user._id);
    sendSuccess(res, result);
  };
}
