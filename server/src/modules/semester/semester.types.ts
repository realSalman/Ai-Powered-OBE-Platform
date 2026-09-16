import { Types } from 'mongoose';
import { ISoftDeleteSchema } from '../../core/plugins/softDeletePlugin';

export type SemesterStatus = 'upcoming' | 'active' | 'completed';

export interface ISemester extends ISoftDeleteSchema {
  _id: Types.ObjectId;
  name: string;
  department: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  status: SemesterStatus;
  isActive: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
