import { Types } from 'mongoose';
import { ISoftDeleteSchema } from '../../core/plugins/softDeletePlugin';

export interface ISectionAssignment extends ISoftDeleteSchema {
  _id: Types.ObjectId;
  student: Types.ObjectId;
  semester: Types.ObjectId;
  batch: Types.ObjectId;
  department: Types.ObjectId;
  section: string;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
