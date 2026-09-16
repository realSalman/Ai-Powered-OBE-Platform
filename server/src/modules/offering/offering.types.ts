import { Types } from 'mongoose';
import { ISoftDeleteSchema } from '../../core/plugins/softDeletePlugin';

export interface ICourseOffering extends ISoftDeleteSchema {
  _id: Types.ObjectId;
  course: Types.ObjectId;
  semester: Types.ObjectId;
  batch: Types.ObjectId;
  department: Types.ObjectId;
  section: string;
  teacher: Types.ObjectId | null;
  courseCode: string;
  courseTitle: string;
  semesterName: string;
  teacherName: string | null;
  teacherInitial: string | null;
  isActive: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
