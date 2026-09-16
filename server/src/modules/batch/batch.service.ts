import { BatchModel } from './batch.model';
import { DepartmentModel } from '../department/department.model';
import { ProgramModel } from '../program/program.model';
import { NotFoundError, ConflictError, ValidationError } from '../../core/errors';
import { QueryBuilder } from '../../core/utils/queryBuilder';
import { cacheAside } from '../../core/utils/cacheAside';
import { cacheInvalidate } from '../../config/redis';

export class BatchService {
  async create(data: any) {
    const dept = await DepartmentModel.findById(data.department);
    if (!dept) {
      throw new NotFoundError('Department', data.department);
    }

    if (dept.hasPrograms && !data.program) {
      throw new ValidationError({ program: 'Program is required for this department' });
    }
    if (data.program) {
      const program = await ProgramModel.findById(data.program);
      if (!program) {
        throw new NotFoundError('Program', data.program);
      }
      if (program.department.toString() !== data.department) {
        throw new ValidationError({ program: 'Program does not belong to the selected department' });
      }
    }

    const existing = await BatchModel.findOne({ code: data.code, department: data.department });
    if (existing) {
      throw new ConflictError(`Batch with code ${data.code} already exists in this department`);
    }

    const batch = await BatchModel.create(data);
    await cacheInvalidate(`batches:${data.department}:*`);
    return batch;
  }

  async update(id: string, data: any) {
    const batch = await BatchModel.findById(id);
    if (!batch) {
      throw new NotFoundError('Batch', id);
    }

    if (data.department && data.department !== batch.department.toString()) {
      const dept = await DepartmentModel.findById(data.department);
      if (!dept) {
        throw new NotFoundError('Department', data.department);
      }
      batch.department = data.department;
    }

    const currentDeptId = data.department || batch.department.toString();
    const dept = await DepartmentModel.findById(currentDeptId);

    if (dept?.hasPrograms && !data.program && !batch.program) {
      throw new ValidationError({ program: 'Program is required for this department' });
    }

    if (data.program) {
      const program = await ProgramModel.findById(data.program);
      if (!program) {
        throw new NotFoundError('Program', data.program);
      }
      if (program.department.toString() !== currentDeptId) {
        throw new ValidationError({ program: 'Program does not belong to the selected department' });
      }
    }

    const code = data.code || batch.code;
    if (data.code || data.department) {
      const existing = await BatchModel.findOne({
        _id: { $ne: id },
        code,
        department: currentDeptId
      });
      if (existing) {
        throw new ConflictError(`Batch with code ${code} already exists in this department`);
      }
    }

    Object.assign(batch, data);
    await batch.save();

    await cacheInvalidate(`batch:${id}`);
    await cacheInvalidate(`batches:${batch.department}:*`);
    return batch;
  }

  async findById(id: string) {
    const batch = await cacheAside(`batch:${id}`, 3600, () =>
      BatchModel.findById(id)
        .populate('department', 'code name')
        .populate('program', 'code name')
        .lean()
    );
    if (!batch) {
      throw new NotFoundError('Batch', id);
    }
    return batch;
  }

  async list(queryParams: any, departmentScope?: string | null) {
    if (departmentScope) {
      queryParams.department = departmentScope;
    }
    return new QueryBuilder(BatchModel, queryParams)
      .filter()
      .sort()
      .search(['name', 'code'])
      .populate('department', 'code name')
      .populate('program', 'code name')
      .paginate();
  }

  async delete(id: string) {
    const batch = await BatchModel.findById(id);
    if (!batch) {
      throw new NotFoundError('Batch', id);
    }
    await (batch as any).softDelete();
    await cacheInvalidate(`batch:${id}`);
    await cacheInvalidate(`batches:${batch.department}:*`);
    return { success: true };
  }
}
