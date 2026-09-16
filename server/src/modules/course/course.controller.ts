import { Response } from 'express';
import { CourseService } from './course.service';
import { sendSuccess } from '../../core/types/response';

const service = new CourseService();

export class CourseController {
  static create = async (req: any, res: Response) => {
    const course = await service.create(req.body);
    sendSuccess(res, course, undefined, 201);
  };

  static update = async (req: any, res: Response) => {
    const course = await service.update(req.params.id, req.body);
    sendSuccess(res, course);
  };

  static findById = async (req: any, res: Response) => {
    const course = await service.findById(req.params.id);
    sendSuccess(res, course);
  };

  static getCoPoMatrix = async (req: any, res: Response) => {
    const result = await service.getCoPoMatrix(req.params.id);
    sendSuccess(res, result);
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
