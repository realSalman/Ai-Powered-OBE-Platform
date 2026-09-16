import mongoose, { Schema, Model } from 'mongoose';
import { IExam } from './exam.types';
import { auditPlugin } from '../../core/plugins/auditPlugin';
import { softDeletePlugin } from '../../core/plugins/softDeletePlugin';

const coMappingSchema = new Schema({
  co: { type: String, required: true },
  percentage: { type: Number, required: true, min: 1, max: 100 }
}, { _id: false });

const questionSchema = new Schema({
  number: { type: String, required: true },
  text: { type: String, required: false, trim: true, maxlength: 2000, default: '' },
  marks: { type: Number, required: true },
  coMapping: {
    type: [coMappingSchema],
    required: true,
    validate: {
      validator: (v: any[]) => v && v.length >= 1 && v.reduce((s, e) => s + e.percentage, 0) === 100,
      message: 'coMapping must have ≥1 entry and percentages must sum to 100'
    }
  }
}, { _id: false });

const examSchema = new Schema<IExam>({
  name: { type: String, required: true, trim: true },
  totalMarks: { type: Number, required: true },
  cosCovered: [{ type: String }],
  courseOffering: { type: Schema.Types.ObjectId, ref: 'CourseOffering', required: true },
  questions: [questionSchema],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Pre-save hook to compute cosCovered from questions
examSchema.pre('save', function (this: any) {
  if (this.questions && this.questions.length > 0) {
    const cos = new Set<string>();
    this.questions.forEach((q: any) => {
      if (q.coMapping) {
        q.coMapping.forEach((m: any) => cos.add(m.co));
      }
    });
    this.cosCovered = Array.from(cos).sort();
  }
});

// Attach plugins
examSchema.plugin(auditPlugin);
examSchema.plugin(softDeletePlugin);

// Indexes
examSchema.index({ courseOffering: 1, name: 1 }, { unique: true });
examSchema.index({ courseOffering: 1 });

export const ExamModel: Model<IExam> = mongoose.model<IExam>('Exam', examSchema);
