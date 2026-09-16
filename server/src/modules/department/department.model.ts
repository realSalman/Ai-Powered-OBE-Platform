import mongoose, { Schema, Model } from 'mongoose';
import { IDepartment } from './department.types';
import { auditPlugin } from '../../core/plugins/auditPlugin';
import { softDeletePlugin } from '../../core/plugins/softDeletePlugin';

const programOutcomeSchema = new Schema({
  code: { type: String, required: true },
  description: { type: String, required: true }
}, { _id: false });

const departmentSchema = new Schema<IDepartment>({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  hasPrograms: { type: Boolean, default: false },
  programOutcomes: [programOutcomeSchema],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Attach plugins
departmentSchema.plugin(auditPlugin);
departmentSchema.plugin(softDeletePlugin);

// Indexes
departmentSchema.index({ isActive: 1 });

export const DepartmentModel: Model<IDepartment> = mongoose.model<IDepartment>('Department', departmentSchema);
