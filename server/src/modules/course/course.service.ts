import { CourseModel } from './course.model';
import { DepartmentModel } from '../department/department.model';
import { ProgramModel } from '../program/program.model';
import { NotFoundError, ConflictError, ValidationError } from '../../core/errors';
import { QueryBuilder } from '../../core/utils/queryBuilder';
import { cacheAside } from '../../core/utils/cacheAside';
import { cacheInvalidate } from '../../config/redis';

export class CourseService {
  async resolvePOs(dept: any, programId?: string | null) {
    if (dept.hasPrograms) {
      if (!programId) {
        throw new ValidationError({ program: 'Program is required to resolve POs for this department' });
      }
      const program = await ProgramModel.findById(programId);
      if (!program) {
        throw new NotFoundError('Program', programId);
      }
      return program.programOutcomes;
    }
    return dept.programOutcomes;
  }

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

    // Resolve POs and validate that coPoMapping only references valid PO codes
    const pos = await this.resolvePOs(dept, data.program);
    const validPoCodes = new Set(pos.map((po: any) => po.code));
    const invalidPoMapping = data.coPoMapping.find((m: any) => !validPoCodes.has(m.po));
    if (invalidPoMapping) {
      throw new ValidationError({ coPoMapping: `Invalid PO reference: ${invalidPoMapping.po}` });
    }

    const existing = await CourseModel.findOne({ code: data.code.toUpperCase(), department: data.department });
    if (existing) {
      throw new ConflictError(`Course with code ${data.code} already exists in this department`);
    }

    const course = await CourseModel.create(data);
    await cacheInvalidate(`courses:${data.department}:*`);
    return course;
  }

  async update(id: string, data: any) {
    const course = await CourseModel.findById(id);
    if (!course) {
      throw new NotFoundError('Course', id);
    }

    if (data.department && data.department !== course.department.toString()) {
      const dept = await DepartmentModel.findById(data.department);
      if (!dept) {
        throw new NotFoundError('Department', data.department);
      }
      course.department = data.department;
    }

    const currentDeptId = data.department || course.department.toString();
    const dept = await DepartmentModel.findById(currentDeptId);

    if (dept?.hasPrograms && !data.program && !course.program) {
      throw new ValidationError({ program: 'Program is required for this department' });
    }

    const currentProgramId = data.program !== undefined ? data.program : course.program?.toString();

    if (currentProgramId) {
      const program = await ProgramModel.findById(currentProgramId);
      if (!program) {
        throw new NotFoundError('Program', currentProgramId);
      }
      if (program.department.toString() !== currentDeptId) {
        throw new ValidationError({ program: 'Program does not belong to the selected department' });
      }
    }

    // Validate mappings if updated
    if (data.coPoMapping || data.courseOutcomes || data.program || data.department) {
      const mappings = data.coPoMapping || course.coPoMapping;
      const outcomes = data.courseOutcomes || course.courseOutcomes;
      const pos = await this.resolvePOs(dept!, currentProgramId);
      const validPoCodes = new Set(pos.map((po: any) => po.code));
      const validCoCodes = new Set(outcomes.map((co: any) => co.code));

      const invalidPo = mappings.find((m: any) => !validPoCodes.has(m.po));
      if (invalidPo) {
        throw new ValidationError({ coPoMapping: `Invalid PO reference: ${invalidPo.po}` });
      }

      const invalidCo = mappings.find((m: any) => !validCoCodes.has(m.co));
      if (invalidCo) {
        throw new ValidationError({ coPoMapping: `Invalid CO reference: ${invalidCo.co}` });
      }
    }

    const code = data.code || course.code;
    if (data.code || data.department) {
      const existing = await CourseModel.findOne({
        _id: { $ne: id },
        code: code.toUpperCase(),
        department: currentDeptId
      });
      if (existing) {
        throw new ConflictError(`Course with code ${code} already exists in this department`);
      }
    }

    Object.assign(course, data);
    await course.save();

    await cacheInvalidate(`course:${id}`);
    await cacheInvalidate(`courses:${course.department}:*`);
    return course;
  }

  async findById(id: string) {
    const course = await cacheAside(`course:${id}`, 600, () =>
      CourseModel.findById(id)
        .populate('department', 'code name hasPrograms programOutcomes')
        .populate('program', 'code name programOutcomes')
        .lean()
    );
    if (!course) {
      throw new NotFoundError('Course', id);
    }
    return course;
  }

  async list(queryParams: any, departmentScope?: string | null) {
    if (departmentScope) {
      queryParams.department = departmentScope;
    }
    return new QueryBuilder(CourseModel, queryParams)
      .filter()
      .sort()
      .search(['code', 'title'])
      .populate('department', 'code name')
      .populate('program', 'code name')
      .paginate();
  }

  async getCoPoMatrix(courseId: string) {
    const course = await CourseModel.findById(courseId).lean();
    if (!course) {
      throw new NotFoundError('Course', courseId);
    }
    const dept = await DepartmentModel.findById(course.department).lean();
    if (!dept) {
      throw new NotFoundError('Department', course.department.toString());
    }
    const pos = await this.resolvePOs(dept, course.program?.toString());

    const matrix = course.courseOutcomes.map(co => ({
      co,
      mappings: pos.map((po: any) => {
        const mapping = course.coPoMapping.find(m => m.co === co.code && m.po === po.code);
        return {
          po: po.code,
          weight: mapping ? mapping.weight : 0
        };
      })
    }));

    return { course, programOutcomes: pos, matrix };
  }

  async delete(id: string) {
    const course = await CourseModel.findById(id);
    if (!course) {
      throw new NotFoundError('Course', id);
    }
    await (course as any).softDelete();
    await cacheInvalidate(`course:${id}`);
    await cacheInvalidate(`courses:${course.department}:*`);
    return { success: true };
  }
}
