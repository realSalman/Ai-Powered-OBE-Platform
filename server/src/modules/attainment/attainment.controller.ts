import { Response } from 'express';
import { AttainmentService } from './attainment.service';
import { sendSuccess } from '../../core/types/response';
import { ValidationError } from '../../core/errors';

const service = new AttainmentService();

export class AttainmentController {
  static getConfig = async (req: any, res: Response) => {
    const departmentId = req.departmentScope || req.query.department || req.user.department;
    if (!departmentId) {
      throw new ValidationError({ department: 'Department ID is required' });
    }
    const config = await service.getConfig(departmentId.toString());
    sendSuccess(res, config);
  };

  static saveConfig = async (req: any, res: Response) => {
    const departmentId = req.departmentScope || req.body.department || req.user.department;
    if (!departmentId) {
      throw new ValidationError({ department: 'Department ID is required' });
    }
    const config = await service.saveConfig(departmentId.toString(), req.body, req.user._id);
    sendSuccess(res, config);
  };

  static examAttainment = async (req: any, res: Response) => {
    const attainment = await service.computeExamAttainment(req.params.examId);
    sendSuccess(res, attainment);
  };

  static offeringAttainment = async (req: any, res: Response) => {
    const attainment = await service.computeOfferingAttainment(req.params.offeringId);
    sendSuccess(res, attainment);
  };

  static poAttainment = async (req: any, res: Response) => {
    const attainment = await service.computePOAttainment(req.params.offeringId);
    sendSuccess(res, attainment);
  };

  static batchAttainment = async (req: any, res: Response) => {
    const attainment = await service.computeBatchAttainment(req.params.batchId, req.params.semesterId);
    sendSuccess(res, attainment);
  };

  static deptAttainment = async (req: any, res: Response) => {
    const attainment = await service.computeDepartmentAttainment(req.params.deptId, req.params.semesterId);
    sendSuccess(res, attainment);
  };
}
