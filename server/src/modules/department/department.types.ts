import { Types } from 'mongoose';
import { ISoftDeleteSchema } from '../../core/plugins/softDeletePlugin';

export interface IProgramOutcome {
  code: string;
  description: string;
}

export interface IDepartment extends ISoftDeleteSchema {
  _id: Types.ObjectId;
  code: string;
  name: string;
  hasPrograms: boolean;
  programOutcomes: IProgramOutcome[];
  isActive: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
