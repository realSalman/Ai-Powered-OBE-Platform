import mongoose, { Schema, Model } from 'mongoose';
import { IStudentMark } from './marks.types';
import { auditPlugin } from '../../core/plugins/auditPlugin';
import { softDeletePlugin } from '../../core/plugins/softDeletePlugin';

const questionMarkSchema = new Schema({
  question: { type: String, required: true },
  marksObtained: { type: Number, required: true, min: 0 }
}, { _id: false });

const studentMarkSchema = new Schema<IStudentMark>({
  exam: { type: Schema.Types.ObjectId, ref: 'Exam', required: true },
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  courseOffering: { type: Schema.Types.ObjectId, ref: 'CourseOffering', required: true },
  questionMarks: [questionMarkSchema],
  totalObtained: { type: Number, required: true, default: 0 },
  submittedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  submittedAt: { type: Date, required: true, default: Date.now }
}, { timestamps: true });

// Attach plugins
studentMarkSchema.plugin(auditPlugin);
studentMarkSchema.plugin(softDeletePlugin);

// Optimized Indexes:
// 1. Compound unique index with soft-delete partial filter expression
studentMarkSchema.index(
  { exam: 1, student: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } }
);
// 2. Index for queries filtering courseOffering
studentMarkSchema.index({ courseOffering: 1 });
// 3. Index for querying all marks for a student across courses (exam prefix already covers exam queries)
studentMarkSchema.index({ student: 1 });

export const StudentMarkModel: Model<IStudentMark> = mongoose.model<IStudentMark>('StudentMark', studentMarkSchema);
