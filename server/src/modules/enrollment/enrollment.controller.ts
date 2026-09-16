import { Response } from 'express';
import { EnrollmentService } from './enrollment.service';
import { sendSuccess } from '../../core/types/response';

const service = new EnrollmentService();

export class EnrollmentController {
  static create = async (req: any, res: Response) => {
    const enrollment = await service.create(req.body);
    sendSuccess(res, enrollment, undefined, 201);
  };

  static bulkEnroll = async (req: any, res: Response) => {
    const enrollments = await service.bulkEnroll(req.body);
    sendSuccess(res, enrollments, undefined, 201);
  };

  static update = async (req: any, res: Response) => {
    const enrollment = await service.update(req.params.id, req.body);
    sendSuccess(res, enrollment);
  };

  static findById = async (req: any, res: Response) => {
    const enrollment = await service.findById(req.params.id);
    sendSuccess(res, enrollment);
  };

  static getMyEnrollments = async (req: any, res: Response) => {
    const queryParams = { ...req.query, student: req.user._id };
    const result = await service.list(queryParams, null);
    sendSuccess(res, result.data, result.meta);
  };

  static list = async (req: any, res: Response) => {
    const result = await service.list(req.query, req.departmentScope, req.user);
    sendSuccess(res, result.data, result.meta);
  };

  static delete = async (req: any, res: Response) => {
    const result = await service.delete(req.params.id);
    sendSuccess(res, result);
  };
}
