import { Response } from 'express';
import { StudentInsightsService } from './studentInsights.service';
import { sendSuccess } from '../../core/types/response';
import { ValidationError } from '../../core/errors';

const service = new StudentInsightsService();

export class StudentInsightsController {
  /**
   * GET /api/student-insights/gaps/:courseOfferingId
   * Returns cognitive gap analysis for the authenticated student.
   */
  static analyzeGaps = async (req: any, res: Response) => {
    const studentId = req.user._id;
    const { courseOfferingId } = req.params;

    if (!courseOfferingId) {
      throw new ValidationError({ courseOfferingId: 'Course offering ID is required' });
    }

    const analysis = await service.analyzeGaps(studentId, courseOfferingId);
    sendSuccess(res, analysis);
  };

  /**
   * GET /api/student-insights/prediction/:courseOfferingId
   * Returns path-to-pass prediction for the authenticated student.
   */
  static predictPath = async (req: any, res: Response) => {
    const studentId = req.user._id;
    const { courseOfferingId } = req.params;

    if (!courseOfferingId) {
      throw new ValidationError({ courseOfferingId: 'Course offering ID is required' });
    }

    const prediction = await service.predictPath(studentId, courseOfferingId);
    sendSuccess(res, prediction);
  };
}
