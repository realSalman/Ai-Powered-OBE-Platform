import mongoose, { Schema, Model } from 'mongoose';
import { ISemester } from './semester.types';
import { auditPlugin } from '../../core/plugins/auditPlugin';
import { softDeletePlugin } from '../../core/plugins/softDeletePlugin';

const semesterSchema = new Schema<ISemester>({
  name: { type: String, required: true, trim: true },
  department: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  status: { type: String, enum: ['upcoming', 'active', 'completed'], default: 'upcoming' },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Attach plugins
semesterSchema.plugin(auditPlugin);
semesterSchema.plugin(softDeletePlugin);

// Indexes
semesterSchema.index({ name: 1, department: 1 }, { unique: true });
semesterSchema.index({ department: 1 });
semesterSchema.index({ status: 1 });
semesterSchema.index({ isActive: 1 });

export const SemesterModel: Model<ISemester> = mongoose.model<ISemester>('Semester', semesterSchema);
