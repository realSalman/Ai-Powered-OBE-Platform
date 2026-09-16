import { Response } from 'express';
import { ProgramService } from './program.service';
import { sendSuccess } from '../../core/types/response';

const service = new ProgramService();

export class ProgramController {
  static create = async (req: any, res: Response) => {
    const program = await service.create(req.body);
    sendSuccess(res, program, undefined, 201);
  };

  static update = async (req: any, res: Response) => {
    const program = await service.update(req.params.id, req.body);
    sendSuccess(res, program);
  };

  static findById = async (req: any, res: Response) => {
    const program = await service.findById(req.params.id);
    sendSuccess(res, program);
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
