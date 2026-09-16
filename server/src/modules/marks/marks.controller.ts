import { Response } from 'express';
import { MarksService } from './marks.service';
import { sendSuccess } from '../../core/types/response';

const service = new MarksService();

export class MarksController {
  static submit = async (req: any, res: Response) => {
    const mark = await service.submitMarks(req.body, req.user);
    sendSuccess(res, mark, undefined, 201);
  };

  static bulkSubmit = async (req: any, res: Response) => {
    const marks = await service.bulkSubmitMarks(req.body, req.user);
    sendSuccess(res, marks, undefined, 201);
  };

  static list = async (req: any, res: Response) => {
    const result = await service.list(req.query, req.departmentScope);
    sendSuccess(res, result.data, result.meta);
  };

  static getMarksByExam = async (req: any, res: Response) => {
    const marks = await service.getMarksByExam(req.params.examId, req.user);
    sendSuccess(res, marks);
  };

  static getMarksSummary = async (req: any, res: Response) => {
    const summary = await service.getMarksSummary(req.params.examId);
    sendSuccess(res, summary);
  };

  static getStudentMarks = async (req: any, res: Response) => {
    let studentId = req.params.studentId;
    if (req.user.roles.includes('student') && req.user._id.toString() !== studentId) {
      studentId = req.user._id.toString();
    }
    const courseOfferingId = req.query.courseOffering;
    const marks = await service.getMarksByStudent(studentId, courseOfferingId);
    sendSuccess(res, marks);
  };

  static delete = async (req: any, res: Response) => {
    const result = await service.delete(req.params.id);
    sendSuccess(res, result);
  };
}
