import { Types } from 'mongoose';
import { ISoftDeleteSchema } from '../../core/plugins/softDeletePlugin';

export interface IQuestionMark {
  question: string;        // matches Exam.questions[].number
  marksObtained: number;   // 0 <= value <= Exam.questions[].marks
}

export interface IStudentMark extends ISoftDeleteSchema {
  _id: Types.ObjectId;
  exam: Types.ObjectId;
  student: Types.ObjectId;
  courseOffering: Types.ObjectId;
  questionMarks: IQuestionMark[];
  totalObtained: number;
  submittedBy: Types.ObjectId;
  submittedAt: Date;
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
