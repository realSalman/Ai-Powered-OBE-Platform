import { Types } from 'mongoose';
import { ISoftDeleteSchema } from '../../core/plugins/softDeletePlugin';
import { IProgramOutcome } from '../department/department.types';

export interface IProgram extends ISoftDeleteSchema {
  _id: Types.ObjectId;
  code: string;
  name: string;
  department: Types.ObjectId;
  programOutcomes: IProgramOutcome[];
  isActive: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
