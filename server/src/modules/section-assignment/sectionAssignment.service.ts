import { SectionAssignmentModel } from './sectionAssignment.model';
import User, { UserRole } from '../../models/User';
import { SemesterModel } from '../semester/semester.model';
import { BatchModel } from '../batch/batch.model';
import { NotFoundError, ConflictError, ValidationError } from '../../core/errors';
import { QueryBuilder } from '../../core/utils/queryBuilder';
import { withTransaction } from '../../core/utils/transaction';

export class SectionAssignmentService {
  async validateAssignment(studentId: string, semesterId: string, batchId: string, section: string) {
    const student = await User.findById(studentId).lean();
    if (!student) {
      throw new NotFoundError('Student', studentId);
    }
    if (!student.roles.includes(UserRole.STUDENT)) {
      throw new ValidationError({ student: `User ${studentId} is not a student` });
    }

    const semester = await SemesterModel.findById(semesterId).lean();
    if (!semester) {
      throw new NotFoundError('Semester', semesterId);
    }

    const batch = await BatchModel.findById(batchId).lean();
    if (!batch) {
      throw new NotFoundError('Batch', batchId);
    }

    if (!batch.sections.includes(section)) {
      throw new ValidationError({ section: `Section ${section} is not defined in Batch ${batch.name}` });
    }
  }

  async create(data: any) {
    await this.validateAssignment(data.student, data.semester, data.batch, data.section);

    const existing = await SectionAssignmentModel.findOne({ student: data.student, semester: data.semester });
    if (existing) {
      throw new ConflictError(`Student is already assigned to section ${existing.section} for this semester`);
    }

    // Resolve department from batch
    const batch = await BatchModel.findById(data.batch).lean();
    return SectionAssignmentModel.create({ ...data, department: batch!.department });
  }

  async bulkAssign(data: { semester: string; batch: string; section: string; students: string[] }) {
    const { semester, batch, section, students } = data;

    const semesterDoc = await SemesterModel.findById(semester).lean();
    if (!semesterDoc) throw new NotFoundError('Semester', semester);

    const batchDoc = await BatchModel.findById(batch).lean();
    if (!batchDoc) throw new NotFoundError('Batch', batch);

    if (!batchDoc.sections.includes(section)) {
      throw new ValidationError({ section: `Section ${section} does not exist in Batch ${batchDoc.name}` });
    }

    return withTransaction(async (session) => {
      const results = [];
      for (const studentId of students) {
        const student = await User.findById(studentId).session(session).lean();
        if (!student) {
          throw new NotFoundError('Student', studentId);
        }
        if (!student.roles.includes(UserRole.STUDENT)) {
          throw new ValidationError({ student: `User ${studentId} is not a student` });
        }

        const assignment = await SectionAssignmentModel.findOneAndUpdate(
          { student: studentId, semester },
          { student: studentId, semester, batch, section, department: batchDoc.department, isDeleted: false },
          { new: true, upsert: true, session }
        );
        results.push(assignment);
      }
      return results;
    });
  }

  async findById(id: string) {
    const assignment = await SectionAssignmentModel.findById(id)
      .populate('student', 'name email studentId')
      .populate('semester', 'name')
      .populate('batch', 'name code')
      .lean();
    if (!assignment) {
      throw new NotFoundError('SectionAssignment', id);
    }
    return assignment;
  }

  async list(queryParams: any, departmentScope?: string | null) {
    if (departmentScope) {
      queryParams.department = departmentScope;
    }
    return new QueryBuilder(SectionAssignmentModel, queryParams)
      .filter()
      .sort()
      .search(['section'])
      .populate('student', 'name email studentId')
      .populate('semester', 'name')
      .populate('batch', 'name code')
      .paginate();
  }

  async delete(id: string) {
    const assignment = await SectionAssignmentModel.findById(id);
    if (!assignment) {
      throw new NotFoundError('SectionAssignment', id);
    }
    await (assignment as any).softDelete();
    return { success: true };
  }
}
