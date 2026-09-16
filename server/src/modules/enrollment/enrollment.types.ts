import { Types } from 'mongoose';
import { ISoftDeleteSchema } from '../../core/plugins/softDeletePlugin';

export interface IEnrollment extends ISoftDeleteSchema {
  _id: Types.ObjectId;
  student: Types.ObjectId;
  courseOffering: Types.ObjectId;
  isElective: boolean;
  status: 'active' | 'dropped';
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
