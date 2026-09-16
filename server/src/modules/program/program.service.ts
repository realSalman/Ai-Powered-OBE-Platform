import { ProgramModel } from './program.model';
import { DepartmentModel } from '../department/department.model';
import { NotFoundError, ConflictError, ValidationError } from '../../core/errors';
import { QueryBuilder } from '../../core/utils/queryBuilder';
import { cacheAside } from '../../core/utils/cacheAside';
import { cacheInvalidate } from '../../config/redis';

export class ProgramService {
  async create(data: any) {
    const dept = await DepartmentModel.findById(data.department);
    if (!dept) {
      throw new NotFoundError('Department', data.department);
    }
    if (!dept.hasPrograms) {
      throw new ValidationError({ department: 'This department does not manage outcomes at the program level' });
    }

    const existing = await ProgramModel.findOne({ code: data.code.toUpperCase(), department: data.department });
    if (existing) {
      throw new ConflictError(`Program with code ${data.code} already exists in this department`);
    }

    const program = await ProgramModel.create(data);
    await cacheInvalidate(`programs:${data.department}:*`);
    return program;
  }

  async update(id: string, data: any) {
    const program = await ProgramModel.findById(id);
    if (!program) {
      throw new NotFoundError('Program', id);
    }

    if (data.department && data.department !== program.department.toString()) {
      const dept = await DepartmentModel.findById(data.department);
      if (!dept) {
        throw new NotFoundError('Department', data.department);
      }
      if (!dept.hasPrograms) {
        throw new ValidationError({ department: 'This department does not manage outcomes at the program level' });
      }
      program.department = data.department;
    }

    const code = data.code || program.code;
    const department = data.department || program.department;

    if (data.code || data.department) {
      const existing = await ProgramModel.findOne({
        _id: { $ne: id },
        code: code.toUpperCase(),
        department
      });
      if (existing) {
        throw new ConflictError(`Program with code ${code} already exists in this department`);
      }
    }

    Object.assign(program, data);
    await program.save();

    await cacheInvalidate(`program:${id}`);
    await cacheInvalidate(`programs:${program.department}:*`);
    return program;
  }

  async findById(id: string) {
    const program = await cacheAside(`program:${id}`, 3600, () =>
      ProgramModel.findById(id).populate('department', 'code name').lean()
    );
    if (!program) {
      throw new NotFoundError('Program', id);
    }
    return program;
  }

  async list(queryParams: any, departmentScope?: string | null) {
    if (departmentScope) {
      queryParams.department = departmentScope;
    }
    return new QueryBuilder(ProgramModel, queryParams)
      .filter()
      .sort()
      .search(['code', 'name'])
      .populate({ path: 'department', select: 'code name' })
      .paginate();
  }

  async delete(id: string) {
    const program = await ProgramModel.findById(id);
    if (!program) {
      throw new NotFoundError('Program', id);
    }
    await (program as any).softDelete();
    await cacheInvalidate(`program:${id}`);
    await cacheInvalidate(`programs:${program.department}:*`);
    return { success: true };
  }
}
