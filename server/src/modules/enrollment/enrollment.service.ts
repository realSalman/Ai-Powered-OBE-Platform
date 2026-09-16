import { EnrollmentModel } from './enrollment.model';
import { CourseOfferingModel } from '../offering/offering.model';
import { SectionAssignmentModel } from '../section-assignment/sectionAssignment.model';
import User, { UserRole } from '../../models/User';
import { NotFoundError, ConflictError, ValidationError, ForbiddenError } from '../../core/errors';
import { QueryBuilder } from '../../core/utils/queryBuilder';
import { withTransaction } from '../../core/utils/transaction';

export class EnrollmentService {
  async determineElectiveStatus(studentId: string, offering: any): Promise<boolean> {
    const assignment = await SectionAssignmentModel.findOne({
      student: studentId,
      semester: offering.semester,
    }).lean();

    if (!assignment || assignment.section !== offering.section) {
      return true;
    }
    return false;
  }

  async create(data: any) {
    const student = await User.findById(data.student).lean();
    if (!student) throw new NotFoundError('Student', data.student);
    if (!student.roles.includes(UserRole.STUDENT)) {
      throw new ValidationError({ student: `User ${data.student} is not a student` });
    }

    const offering = await CourseOfferingModel.findById(data.courseOffering).lean();
    if (!offering) throw new NotFoundError('CourseOffering', data.courseOffering);

    const isElective = data.isElective !== undefined
      ? data.isElective
      : await this.determineElectiveStatus(data.student, offering);

    const existing = await EnrollmentModel.findOne({
      student: data.student,
      courseOffering: data.courseOffering,
    });
    if (existing) {
      throw new ConflictError(`Student is already enrolled in this course offering`);
    }

    const enrollment = await EnrollmentModel.create({
      student: data.student,
      courseOffering: data.courseOffering,
      isElective,
      status: 'active',
    });

    return enrollment;
  }

  async bulkEnroll(data: { courseOffering: string; students: string[] }) {
    const { courseOffering, students } = data;

    const offering = await CourseOfferingModel.findById(courseOffering).lean();
    if (!offering) throw new NotFoundError('CourseOffering', courseOffering);

    return withTransaction(async (session) => {
      const results = [];
      for (const studentId of students) {
        const student = await User.findById(studentId).session(session).lean();
        if (!student) throw new NotFoundError('Student', studentId);
        if (!student.roles.includes(UserRole.STUDENT)) {
          throw new ValidationError({ student: `User ${studentId} is not a student` });
        }

        const isElective = await this.determineElectiveStatus(studentId, offering);

        const enrollment = await EnrollmentModel.findOneAndUpdate(
          { student: studentId, courseOffering },
          { student: studentId, courseOffering, isElective, status: 'active', isDeleted: false },
          { new: true, upsert: true, session }
        );
        results.push(enrollment);
      }
      return results;
    });
  }

  async update(id: string, data: any) {
    const enrollment = await EnrollmentModel.findById(id);
    if (!enrollment) throw new NotFoundError('Enrollment', id);

    if (data.status) {
      enrollment.status = data.status;
    }

    await enrollment.save();
    return enrollment;
  }

  async findById(id: string) {
    const enrollment = await EnrollmentModel.findById(id)
      .populate('student', 'name email studentId')
      .populate({
        path: 'courseOffering',
        populate: [
          { path: 'course' },
          { path: 'semester', select: 'name status' },
          { path: 'batch', select: 'name code' },
          { path: 'teacher', select: 'name email teacherInitial' }
        ]
      })
      .lean();
    if (!enrollment) throw new NotFoundError('Enrollment', id);
    return enrollment;
  }

  async list(queryParams: any, departmentScope?: string | null, actor?: any) {
    if (actor) {
      const isFaculty = actor.roles.includes('faculty');
      const isPrivileged = actor.roles.some((r: string) => ['admin', 'superadmin', 'HOD', 'supervisor'].includes(r));
      if (isFaculty && !isPrivileged) {
        const offeringId = queryParams.courseOffering;
        if (!offeringId) {
          throw new ForbiddenError('Faculty members must filter enrollments by courseOffering');
        }
        const offering = await CourseOfferingModel.findOne({
          _id: offeringId,
          teacher: actor._id,
          isDeleted: false,
        });
        if (!offering) {
          throw new ForbiddenError("Access Denied: You are not assigned as the teacher for this course offering");
        }
      }
    }

    // If scoped, pre-filter offering IDs by department
    if (departmentScope) {
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
    return new QueryBuilder(EnrollmentModel, queryParams)
      .filter()
      .sort()
      .populate('student', 'name email studentId')
      .populate({
        path: 'courseOffering',
        populate: [
          { path: 'course', select: 'code title credits courseOutcomes' },
          { path: 'semester', select: 'name' },
          { path: 'batch', select: 'name code' }
        ]
      })
      .paginate();
  }

  async delete(id: string) {
    const enrollment = await EnrollmentModel.findById(id);
    if (!enrollment) throw new NotFoundError('Enrollment', id);
    await (enrollment as any).softDelete();
    return { success: true };
  }
}
