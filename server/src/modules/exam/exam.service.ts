import { ExamModel } from './exam.model';
import { CourseOfferingModel } from '../offering/offering.model';
import { CourseModel } from '../course/course.model';
import { EnrollmentModel } from '../enrollment/enrollment.model';
import { NotFoundError, ConflictError, ValidationError, ForbiddenError } from '../../core/errors';
import { QueryBuilder } from '../../core/utils/queryBuilder';
import { withTransaction } from '../../core/utils/transaction';

export class ExamService {
  async validateExamData(offeringId: string, cosCovered: string[], questions: any[] = [], actorId?: string) {
    const offering = await CourseOfferingModel.findById(offeringId).lean();
    if (!offering) throw new NotFoundError('CourseOffering', offeringId);

    if (actorId) {
      const isTeacher = offering.teacher && offering.teacher.toString() === actorId;
      if (!isTeacher) {
        throw new ForbiddenError("Access Denied: You are not assigned as the teacher for this course offering");
      }
    }

    const course = await CourseModel.findById(offering.course).lean();
    if (!course) throw new NotFoundError('Course', offering.course.toString());

    const courseCos = new Set(course.courseOutcomes.map(co => co.code));

    const invalidCo = cosCovered.find(co => !courseCos.has(co));
    if (invalidCo) {
      throw new ValidationError({ cosCovered: `CO ${invalidCo} does not exist in Course ${course.code}` });
    }

    const invalidQuestionCo = questions.find(q => 
      q.coMapping && q.coMapping.some((mapping: any) => !courseCos.has(mapping.co))
    );
    if (invalidQuestionCo) {
      const badCo = invalidQuestionCo.coMapping.find((m: any) => !courseCos.has(m.co))?.co;
      throw new ValidationError({ questions: `Question refers to non-existent CO: ${badCo}` });
    }
  }

  async create(data: any, actorId?: string) {
    await this.validateExamData(data.courseOffering, data.cosCovered, data.questions, actorId);

    const existing = await ExamModel.findOne({
      courseOffering: data.courseOffering,
      name: data.name,
    });
    if (existing) {
      throw new ConflictError(`Exam with name ${data.name} already exists for this course offering`);
    }

    return ExamModel.create(data);
  }


  async update(id: string, data: any, actorId?: string) {
    const exam = await ExamModel.findById(id);
    if (!exam) throw new NotFoundError('Exam', id);

    const cos = data.cosCovered || exam.cosCovered;
    const questions = data.questions || exam.questions;

    await this.validateExamData(exam.courseOffering.toString(), cos, questions, actorId);

    Object.assign(exam, data);
    await exam.save();
    return exam;
  }

  async findById(id: string) {
    const exam = await ExamModel.findById(id)
      .populate({
        path: 'courseOffering',
        populate: [
          { path: 'course', select: 'code title' },
          { path: 'semester', select: 'name' },
          { path: 'batch', select: 'name code' }
        ]
      })
      .lean();
    if (!exam) throw new NotFoundError('Exam', id);
    return exam;
  }

  async list(queryParams: any, departmentScope?: string | null, user?: any) {
    if (user && user.roles && user.roles.includes('student')) {
      const enrolledOfferings = await EnrollmentModel.find({ 
        student: user._id, 
        status: 'active', 
        isDeleted: false 
      }).distinct('courseOffering');
      
      if (queryParams.courseOffering) {
        const requestedId = queryParams.courseOffering.toString();
        const hasAccess = enrolledOfferings.map(id => id.toString()).includes(requestedId);
        if (!hasAccess) {
          queryParams.courseOffering = { $in: [] };
        }
      } else {
        queryParams.courseOffering = { $in: enrolledOfferings };
      }
    } else if (departmentScope) {
      // If scoped, pre-filter offering IDs by department
      const offeringIds = await CourseOfferingModel.find({ department: departmentScope }).distinct('_id');
      if (queryParams.courseOffering) {
        const requestedId = queryParams.courseOffering.toString();
        const hasAccess = offeringIds.map(id => id.toString()).includes(requestedId);
        if (!hasAccess) {
          queryParams.courseOffering = { $in: [] };
        }
      } else {
        queryParams.courseOffering = { $in: offeringIds };
      }
    }
    return new QueryBuilder(ExamModel, queryParams)
      .filter()
      .sort()
      .search(['name'])
      .populate({
        path: 'courseOffering',
        populate: [
          { path: 'course', select: 'code title' },
          { path: 'semester', select: 'name' },
          { path: 'batch', select: 'name code' }
        ]
      })
      .paginate();
  }

  async delete(id: string, actorId?: string) {
    const exam = await ExamModel.findById(id);
    if (!exam) throw new NotFoundError('Exam', id);

    if (actorId) {
      const offering = await CourseOfferingModel.findById(exam.courseOffering).lean();
      if (!offering) throw new NotFoundError('CourseOffering', exam.courseOffering.toString());
      const isTeacher = offering.teacher && offering.teacher.toString() === actorId;
      if (!isTeacher) {
        throw new ForbiddenError("Access Denied: You are not assigned as the teacher for this course offering");
      }
    }

    await (exam as any).softDelete();
    return { success: true };
  }
}
