import { CourseOfferingModel } from './offering.model';
import { CourseModel } from '../course/course.model';
import { SemesterModel } from '../semester/semester.model';
import { BatchModel } from '../batch/batch.model';
import User, { UserRole } from '../../models/User';
import { NotFoundError, ConflictError, ValidationError } from '../../core/errors';
import { QueryBuilder } from '../../core/utils/queryBuilder';
import { withTransaction } from '../../core/utils/transaction';

export class CourseOfferingService {
  async resolveDenormalizedData(courseId: string, semesterId: string, teacherId?: string | null) {
    const course = await CourseModel.findById(courseId).lean();
    if (!course) throw new NotFoundError('Course', courseId);

    const semester = await SemesterModel.findById(semesterId).lean();
    if (!semester) throw new NotFoundError('Semester', semesterId);

    let teacherName: string | null = null;
    let teacherInitial: string | null = null;

    if (teacherId) {
      const teacher = await User.findById(teacherId).lean();
      if (!teacher) throw new NotFoundError('Teacher', teacherId);
      if (!teacher.roles.includes(UserRole.FACULTY)) {
        throw new ValidationError({ teacher: `User ${teacherId} is not a faculty member` });
      }
      teacherName = teacher.name;
      teacherInitial = teacher.teacherInitial || null;
    }

    return {
      courseCode: course.code,
      courseTitle: course.title,
      semesterName: semester.name,
      teacherName,
      teacherInitial,
    };
  }

  async create(data: any) {
    const batch = await BatchModel.findById(data.batch).lean();
    if (!batch) throw new NotFoundError('Batch', data.batch);

    if (!batch.sections.includes(data.section)) {
      throw new ValidationError({ section: `Section ${data.section} is not defined in Batch ${batch.name}` });
    }

    const denormalized = await this.resolveDenormalizedData(data.course, data.semester, data.teacher);

    const existing = await CourseOfferingModel.findOne({
      course: data.course,
      semester: data.semester,
      batch: data.batch,
      section: data.section,
    });
    if (existing) {
      throw new ConflictError(`This course section is already offered in this semester for this batch`);
    }

    const offeringData = {
      ...data,
      ...denormalized,
      department: (await CourseModel.findById(data.course).lean())!.department,
    };

    return CourseOfferingModel.create(offeringData);
  }

  async bulkCreate(data: { semester: string; batch: string; offerings: Array<{ course: string; section: string; teacher?: string | null }> }) {
    const { semester, batch, offerings } = data;

    const semesterDoc = await SemesterModel.findById(semester).lean();
    if (!semesterDoc) throw new NotFoundError('Semester', semester);

    const batchDoc = await BatchModel.findById(batch).lean();
    if (!batchDoc) throw new NotFoundError('Batch', batch);

    return withTransaction(async (session) => {
      const results = [];
      for (const item of offerings) {
        if (!batchDoc.sections.includes(item.section)) {
          throw new ValidationError({ section: `Section ${item.section} is not defined in Batch ${batchDoc.name}` });
        }

        const denormalized = await this.resolveDenormalizedData(item.course, semester, item.teacher);

        const existing = await CourseOfferingModel.findOne({
          course: item.course,
          semester,
          batch,
          section: item.section,
        }).session(session);
        
        if (existing) {
          throw new ConflictError(`Course section ${item.section} for course ${denormalized.courseCode} is already offered`);
        }

        const course = await CourseModel.findById(item.course).session(session).lean();
        if (!course) throw new NotFoundError('Course', item.course);

        const offering = await CourseOfferingModel.create([{
          course: item.course,
          semester,
          batch,
          section: item.section,
          teacher: item.teacher || null,
          department: course.department,
          ...denormalized,
        }], { session });

        results.push(offering[0]);
      }
      return results;
    });
  }

  async update(id: string, data: any) {
    const offering = await CourseOfferingModel.findById(id);
    if (!offering) throw new NotFoundError('CourseOffering', id);

    if (data.teacher !== undefined) {
      if (data.teacher) {
        const teacher = await User.findById(data.teacher).lean();
        if (!teacher) throw new NotFoundError('Teacher', data.teacher);
        if (!teacher.roles.includes(UserRole.FACULTY)) {
          throw new ValidationError({ teacher: `User ${data.teacher} is not a faculty member` });
        }
        offering.teacher = data.teacher;
        offering.teacherName = teacher.name;
        offering.teacherInitial = teacher.teacherInitial || null;
      } else {
        offering.teacher = null;
        offering.teacherName = null;
        offering.teacherInitial = null;
      }
    }

    if (data.isActive !== undefined) {
      offering.isActive = data.isActive;
    }

    await offering.save();
    return offering;
  }

  async findById(id: string) {
    const offering = await CourseOfferingModel.findById(id)
      .populate('course')
      .populate('semester', 'name startDate endDate status')
      .populate('batch', 'name code')
      .populate('teacher', 'name email teacherInitial')
      .lean();
    if (!offering) throw new NotFoundError('CourseOffering', id);
    return offering;
  }

  async listByTeacherInitial(teacherInitial: string, queryParams: any = {}) {
    queryParams.teacherInitial = teacherInitial;
    return new QueryBuilder(CourseOfferingModel, queryParams)
      .filter()
      .sort()
      .search(['courseCode', 'courseTitle'])
      .populate('course')
      .populate('semester', 'name status')
      .populate('batch', 'name code')
      .populate('teacher', 'name email teacherInitial')
      .paginate();
  }

  async list(queryParams: any, departmentScope?: string | null) {
    if (departmentScope) {
      queryParams.department = departmentScope;
    }
    return new QueryBuilder(CourseOfferingModel, queryParams)
      .filter()
      .sort()
      .search(['courseCode', 'courseTitle', 'teacherInitial'])
      .populate('course')
      .populate('semester', 'name status')
      .populate('batch', 'name code')
      .populate('teacher', 'name email teacherInitial')
      .paginate();
  }

  async delete(id: string) {
    const offering = await CourseOfferingModel.findById(id);
    if (!offering) throw new NotFoundError('CourseOffering', id);
    await (offering as any).softDelete();
    return { success: true };
  }
}
