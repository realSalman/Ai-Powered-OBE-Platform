import { Types } from 'mongoose';
import { ISoftDeleteSchema } from '../../core/plugins/softDeletePlugin';

export interface ICoMapping {
  co: string;
  percentage: number;  // 1-100, all entries must sum to 100
}

export interface IQuestion {
  number: string;
  text: string;
  marks: number;
  coMapping: ICoMapping[];
}

export interface IExam extends ISoftDeleteSchema {
  _id: Types.ObjectId;
  name: string;
  totalMarks: number;
  cosCovered: string[];
  courseOffering: Types.ObjectId;
  questions: IQuestion[];
  isActive: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
