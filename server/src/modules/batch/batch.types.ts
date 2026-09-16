import { Types } from 'mongoose';
import { ISoftDeleteSchema } from '../../core/plugins/softDeletePlugin';

export interface IBatch extends ISoftDeleteSchema {
  _id: Types.ObjectId;
  name: string;
  code: string;
  department: Types.ObjectId;
  program: Types.ObjectId | null;
  sections: string[];
  isActive: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
