import { Response } from 'express';
import { CourseOfferingService } from './offering.service';
import { sendSuccess } from '../../core/types/response';

const service = new CourseOfferingService();

export class CourseOfferingController {
  static create = async (req: any, res: Response) => {
    const offering = await service.create(req.body);
    sendSuccess(res, offering, undefined, 201);
  };

  static bulkCreate = async (req: any, res: Response) => {
    const offerings = await service.bulkCreate(req.body);
    sendSuccess(res, offerings, undefined, 201);
  };

  static update = async (req: any, res: Response) => {
    const offering = await service.update(req.params.id, req.body);
    sendSuccess(res, offering);
  };

  static findById = async (req: any, res: Response) => {
    const offering = await service.findById(req.params.id);
    sendSuccess(res, offering);
  };

  static getMyOfferings = async (req: any, res: Response) => {
    const teacherInitial = req.user?.teacherInitial;
    if (!teacherInitial) {
      sendSuccess(res, []);
      return;
    }
    const result = await service.listByTeacherInitial(teacherInitial, req.query);
    sendSuccess(res, result.data, result.meta);
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
