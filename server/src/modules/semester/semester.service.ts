import { SemesterModel } from './semester.model';
import { DepartmentModel } from '../department/department.model';
import { NotFoundError, ConflictError } from '../../core/errors';
import { QueryBuilder } from '../../core/utils/queryBuilder';
import { cacheAside } from '../../core/utils/cacheAside';
import { cacheInvalidate } from '../../config/redis';
import { withTransaction } from '../../core/utils/transaction';

export class SemesterService {
  async create(data: any) {
    // Validate department exists
    const dept = await DepartmentModel.findById(data.department);
    if (!dept) {
      throw new NotFoundError('Department', data.department);
    }

    const existing = await SemesterModel.findOne({ name: data.name, department: data.department });
    if (existing) {
      throw new ConflictError(`Semester with name ${data.name} already exists in this department`);
    }

    if (data.status === 'active') {
      return withTransaction(async (session) => {
        // Only deactivate semesters within the same department
        await SemesterModel.updateMany(
          { status: 'active', department: data.department },
          { status: 'completed' }
        ).session(session);
        const semester = await SemesterModel.create([data], { session });
        await cacheInvalidate('semesters:*');
        await cacheInvalidate(`semester:active:${data.department}`);
        return semester[0];
      });
    }

    const semester = await SemesterModel.create(data);
    await cacheInvalidate('semesters:*');
    return semester;
  }

  async update(id: string, data: any) {
    const semester = await SemesterModel.findById(id);
    if (!semester) {
      throw new NotFoundError('Semester', id);
    }

    if (data.name && data.name !== semester.name) {
      const existing = await SemesterModel.findOne({
        name: data.name,
        department: semester.department,
      });
      if (existing) {
        throw new ConflictError(`Semester with name ${data.name} already exists in this department`);
      }
    }

    if (data.status === 'active' && semester.status !== 'active') {
      return withTransaction(async (session) => {
        // Only deactivate semesters within the same department
        await SemesterModel.updateMany(
          { status: 'active', department: semester.department },
          { status: 'completed' }
        ).session(session);
        Object.assign(semester, data);
        await semester.save({ session });
        await cacheInvalidate(`semester:${id}`);
        await cacheInvalidate(`semester:active:${semester.department}`);
        await cacheInvalidate('semesters:*');
        return semester;
      });
    }

    Object.assign(semester, data);
    await semester.save();
    await cacheInvalidate(`semester:${id}`);
    if (semester.status === 'active') {
      await cacheInvalidate(`semester:active:${semester.department}`);
    }
    await cacheInvalidate('semesters:*');
    return semester;
  }

  async getActiveSemester(departmentId?: string) {
    if (departmentId) {
      return cacheAside(`semester:active:${departmentId}`, 3600, () =>
        SemesterModel.findOne({ status: 'active', department: departmentId }).lean()
      );
    }
    return cacheAside('semester:active', 3600, () =>
      SemesterModel.findOne({ status: 'active' }).lean()
    );
  }

  async findById(id: string) {
    const semester = await cacheAside(`semester:${id}`, 3600, () =>
      SemesterModel.findById(id).populate('department', 'code name').lean()
    );
    if (!semester) {
      throw new NotFoundError('Semester', id);
    }
    return semester;
  }

  async list(queryParams: any, departmentScope?: string | null) {
    if (departmentScope) {
      queryParams.department = departmentScope;
    }
    return new QueryBuilder(SemesterModel, queryParams)
      .filter()
      .sort()
      .search(['name'])
      .populate('department', 'code name')
      .paginate();
  }

  async delete(id: string) {
    const semester = await SemesterModel.findById(id);
    if (!semester) {
      throw new NotFoundError('Semester', id);
    }
    await (semester as any).softDelete();
    await cacheInvalidate(`semester:${id}`);
    if (semester.status === 'active') {
      await cacheInvalidate(`semester:active:${semester.department}`);
    }
    await cacheInvalidate('semesters:*');
    return { success: true };
  }
}
