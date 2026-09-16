import mongoose, { Schema, Model } from 'mongoose';
import { ISectionAssignment } from './sectionAssignment.types';
import { auditPlugin } from '../../core/plugins/auditPlugin';
import { softDeletePlugin } from '../../core/plugins/softDeletePlugin';

const sectionAssignmentSchema = new Schema<ISectionAssignment>({
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  semester: { type: Schema.Types.ObjectId, ref: 'Semester', required: true },
  batch: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
  department: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
  section: { type: String, required: true, uppercase: true, trim: true }
}, { timestamps: true });

// Attach plugins
sectionAssignmentSchema.plugin(auditPlugin);
sectionAssignmentSchema.plugin(softDeletePlugin);

// Indexes
// A student can be assigned to only one section per semester
sectionAssignmentSchema.index({ student: 1, semester: 1 }, { unique: true });
sectionAssignmentSchema.index({ semester: 1, batch: 1, section: 1 });
sectionAssignmentSchema.index({ department: 1 });
sectionAssignmentSchema.index({ student: 1 });

export const SectionAssignmentModel: Model<ISectionAssignment> = mongoose.model<ISectionAssignment>('SectionAssignment', sectionAssignmentSchema);
