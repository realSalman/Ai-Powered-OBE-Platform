import { StudentMarkModel } from './marks.model';
import { ExamModel } from '../exam/exam.model';
import { EnrollmentModel } from '../enrollment/enrollment.model';
import { NotFoundError, ValidationError, ForbiddenError } from '../../core/errors';
import { QueryBuilder } from '../../core/utils/queryBuilder';
import { withTransaction } from '../../core/utils/transaction';
import mongoose, { Types } from 'mongoose';

export class MarksService {
  /**
   * Helper to validate a single student mark entry against the exam questions and student enrollment.
   */
  private async validateAndPrepareMarkEntry(
    examId: string,
    studentId: string,
    questionMarks: Array<{ question: string; marksObtained: number }>,
    actor: any
  ) {
    const exam = await ExamModel.findOne({ _id: examId, isDeleted: false });
    if (!exam) throw new NotFoundError('Exam', examId);

    // Verify faculty permission
    const isFaculty = actor.roles.includes('faculty');
    const isPrivileged = actor.roles.some((r: string) => ['admin', 'superadmin', 'HOD', 'supervisor'].includes(r));
    if (isFaculty && !isPrivileged) {
      const offering = await mongoose.model('CourseOffering').findOne({
        _id: exam.courseOffering,
        teacher: actor._id,
        isDeleted: false,
      });
      if (!offering) {
        throw new ForbiddenError("Access Denied: You are not assigned as the teacher for this exam's course offering");
      }
    }

    // 1. Verify student enrollment in the course offering
    const enrollment = await EnrollmentModel.findOne({
      student: studentId,
      courseOffering: exam.courseOffering,
      status: 'active',
      isDeleted: false,
    });
    if (!enrollment) {
      throw new ValidationError({
        student: `Student ${studentId} is not enrolled in the course offering for this exam`,
      });
    }

    // 2. Map questions for O(1) lookup
    const questionMap = new Map<string, number>();
    exam.questions.forEach((q) => {
      questionMap.set(q.number, q.marks);
    });

    let totalObtained = 0;
    const validatedQuestions = [];

    for (const qm of questionMarks) {
      const maxMarks = questionMap.get(qm.question);
      if (maxMarks === undefined) {
        throw new ValidationError({
          questions: `Question "${qm.question}" does not exist in exam "${exam.name}"`,
        });
      }

      if (qm.marksObtained < 0 || qm.marksObtained > maxMarks) {
        throw new ValidationError({
          questions: `Marks obtained (${qm.marksObtained}) for question "${qm.question}" exceeds maximum marks (${maxMarks})`,
        });
      }

      totalObtained += qm.marksObtained;
      validatedQuestions.push({
        question: qm.question,
        marksObtained: qm.marksObtained,
      });
    }

    return {
      exam: exam._id,
      student: new Types.ObjectId(studentId),
      courseOffering: exam.courseOffering,
      questionMarks: validatedQuestions,
      totalObtained,
      submittedBy: new Types.ObjectId(actor._id),
      submittedAt: new Date(),
    };
  }

  /**
   * Submit or update marks for a single student.
   */
  async submitMarks(data: any, actor: any) {
    const preparedData = await this.validateAndPrepareMarkEntry(
      data.exam,
      data.student,
      data.questionMarks,
      actor
    );

    const result = await StudentMarkModel.findOneAndUpdate(
      { exam: preparedData.exam, student: preparedData.student },
      { $set: preparedData },
      { upsert: true, new: true, runValidators: true }
    );

    return result;
  }

  /**
   * Bulk submit marks for multiple students. Wraps in transaction for atomicity.
   */
  async bulkSubmitMarks(data: { exam: string; entries: Array<{ student: string; questionMarks: any[] }> }, actor: any) {
    return withTransaction(async (session) => {
      const results = [];
      for (const entry of data.entries) {
        const preparedData = await this.validateAndPrepareMarkEntry(
          data.exam,
          entry.student,
          entry.questionMarks,
          actor
        );

        const result = await StudentMarkModel.findOneAndUpdate(
          { exam: preparedData.exam, student: preparedData.student },
          { $set: preparedData },
          { upsert: true, new: true, runValidators: true, session }
        );
        results.push(result);
      }
      return results;
    });
  }

  /**
   * List marks with pagination & filtering.
   */
  async list(queryParams: any, departmentScope?: string | null) {
    let preFilter: any = {};
    if (departmentScope) {
      // Find offering ids in this department
      const offeringIds = await mongoose.model('CourseOffering').find({ department: departmentScope }).distinct('_id');
      if (queryParams.courseOffering) {
        const requestedId = queryParams.courseOffering.toString();
        const hasAccess = offeringIds.map(id => id.toString()).includes(requestedId);
        if (!hasAccess) {
          preFilter.courseOffering = { $in: [] };
        }
      } else {
        preFilter.courseOffering = { $in: offeringIds };
      }
    }

    return new QueryBuilder(StudentMarkModel, { ...queryParams, ...preFilter })
      .filter()
      .sort()
      .populate('student', 'name studentId email')
      .populate('submittedBy', 'name email')
      .populate({
        path: 'exam',
        select: 'name totalMarks questions'
      })
      .paginate();
  }

  /**
   * Get all marks for a specific exam.
   */
  async getMarksByExam(examId: string, actor?: any) {
    const exam = await ExamModel.findOne({ _id: examId, isDeleted: false });
    if (!exam) throw new NotFoundError('Exam', examId);

    if (actor) {
      const isFaculty = actor.roles.includes('faculty');
      const isPrivileged = actor.roles.some((r: string) => ['admin', 'superadmin', 'HOD', 'supervisor'].includes(r));
      if (isFaculty && !isPrivileged) {
        const offering = await mongoose.model('CourseOffering').findOne({
          _id: exam.courseOffering,
          teacher: actor._id,
          isDeleted: false,
        });
        if (!offering) {
          throw new ForbiddenError("Access Denied: You are not assigned as the teacher for this exam's course offering");
        }
      }
    }

    const marks = await StudentMarkModel.find({ exam: examId, isDeleted: false })
      .populate('student', 'name studentId email')
      .populate('submittedBy', 'name email')
      .lean();
    return marks;
  }

  /**
   * Get all marks for a specific student within a course offering.
   */
  async getMarksByStudent(studentId: string, courseOfferingId: string) {
    const marks = await StudentMarkModel.find({
      student: studentId,
      courseOffering: courseOfferingId,
      isDeleted: false,
    })
      .populate({
        path: 'exam',
        select: 'name totalMarks questions'
      })
      .lean();
    return marks;
  }

  /**
   * Get summary statistics for an exam.
   */
  async getMarksSummary(examId: string) {
    const exam = await ExamModel.findOne({ _id: examId, isDeleted: false }).lean();
    if (!exam) throw new NotFoundError('Exam', examId);

    const marks = await StudentMarkModel.find({ exam: examId, isDeleted: false }).lean();
    if (marks.length === 0) {
      return {
        totalStudents: 0,
        average: 0,
        median: 0,
        min: 0,
        max: 0,
        stdDev: 0,
        passRate: 0,
        passThresholdMarks: exam.totalMarks * 0.5, // 50% passing threshold
      };
    }

    const totalMarks = exam.totalMarks;
    const scores = marks.map((m) => m.totalObtained);
    scores.sort((a, b) => a - b);

    const sum = scores.reduce((a, b) => a + b, 0);
    const average = sum / scores.length;
    const min = scores[0];
    const max = scores[scores.length - 1];

    // Median
    let median = 0;
    const mid = Math.floor(scores.length / 2);
    if (scores.length % 2 !== 0) {
      median = scores[mid];
    } else {
      median = (scores[mid - 1] + scores[mid]) / 2;
    }

    // Standard deviation
    const variance = scores.reduce((sqSum, score) => sqSum + Math.pow(score - average, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);

    // Pass rate: count students with score >= 50% of exam totalMarks
    const passThreshold = totalMarks * 0.5;
    const passingStudents = scores.filter((s) => s >= passThreshold).length;
    const passRate = (passingStudents / scores.length) * 100;

    return {
      totalStudents: scores.length,
      average,
      median,
      min,
      max,
      stdDev,
      passRate,
      passThresholdMarks: passThreshold,
    };
  }

  /**
   * Delete marks by record ID.
   */
  async delete(id: string) {
    const mark = await StudentMarkModel.findById(id);
    if (!mark) throw new NotFoundError('StudentMark', id);
    await (mark as any).softDelete();
    return { success: true };
  }
}
