import { Types } from 'mongoose';
import { ISoftDeleteSchema } from '../../core/plugins/softDeletePlugin';

export interface ICourseOutcome {
  code: string;
  description: string;
  bloomLevel: 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create';
}

export interface ICoPoMapping {
  co: string;
  po: string;
  weight: 1 | 2 | 3;
}




export interface ICourse extends ISoftDeleteSchema {
  _id: Types.ObjectId;
  code: string;
  title: string;
  credits: number;
  type: 'theory' | 'lab' | 'project';
  department: Types.ObjectId;
  program: Types.ObjectId | null;
  courseOutcomes: ICourseOutcome[];
  coPoMapping: ICoPoMapping[];

  isActive: boolean;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
