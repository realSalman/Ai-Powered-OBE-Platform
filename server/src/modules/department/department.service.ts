import { DepartmentModel } from './department.model';
import { NotFoundError, ConflictError } from '../../core/errors';
import { QueryBuilder } from '../../core/utils/queryBuilder';
import { cacheAside } from '../../core/utils/cacheAside';
import { cacheInvalidate } from '../../config/redis';

export class DepartmentService {
  async create(data: any) {
    const existing = await DepartmentModel.findOne({ code: data.code.toUpperCase() });
    if (existing) {
      throw new ConflictError(`Department with code ${data.code} already exists`);
    }

    if (data.hasPrograms) {
      data.programOutcomes = [];
    }

    const dept = await DepartmentModel.create(data);
    await cacheInvalidate('depts:*');
    return dept;
  }

  async update(id: string, data: any) {
    const dept = await DepartmentModel.findById(id);
    if (!dept) {
      throw new NotFoundError('Department', id);
    }

    if (data.code && data.code.toUpperCase() !== dept.code) {
      const existing = await DepartmentModel.findOne({ code: data.code.toUpperCase() });
      if (existing) {
        throw new ConflictError(`Department with code ${data.code} already exists`);
      }
    }

    const finalHasPrograms = data.hasPrograms !== undefined ? data.hasPrograms : dept.hasPrograms;
    if (finalHasPrograms) {
      data.programOutcomes = [];
    }

    Object.assign(dept, data);
    await dept.save();

    await cacheInvalidate(`dept:${id}`);
    await cacheInvalidate('depts:*');
    return dept;
  }

  async findById(id: string) {
    const dept = await cacheAside(`dept:${id}`, 3600, () =>
      DepartmentModel.findById(id).lean()
    );
    if (!dept) {
      throw new NotFoundError('Department', id);
    }
    return dept;
  }

  async list(queryParams: any, departmentScope?: string | null) {
    // If scoped, admin can only see their own department
    if (departmentScope) {
      queryParams._id = departmentScope;
    }
    return new QueryBuilder(DepartmentModel, queryParams)
      .filter()
      .sort()
      .search(['code', 'name'])
      .paginate();
  }

  async delete(id: string) {
    const dept = await DepartmentModel.findById(id);
    if (!dept) {
      throw new NotFoundError('Department', id);
    }
    await (dept as any).softDelete();
    await cacheInvalidate(`dept:${id}`);
    await cacheInvalidate('depts:*');
    return { success: true };
  }
}
