import { Response } from 'express';
import { SectionAssignmentService } from './sectionAssignment.service';
import { sendSuccess } from '../../core/types/response';

const service = new SectionAssignmentService();

export class SectionAssignmentController {
  static create = async (req: any, res: Response) => {
    const assignment = await service.create(req.body);
    sendSuccess(res, assignment, undefined, 201);
  };

  static bulkAssign = async (req: any, res: Response) => {
    const assignments = await service.bulkAssign(req.body);
    sendSuccess(res, assignments, undefined, 201);
  };

  static findById = async (req: any, res: Response) => {
    const assignment = await service.findById(req.params.id);
    sendSuccess(res, assignment);
  };

  static getMySections = async (req: any, res: Response) => {
    req.query.teacherInitial = req.user.teacherInitial;
    const result = await service.list(req.query, null);
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
