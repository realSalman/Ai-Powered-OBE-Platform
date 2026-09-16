import mongoose, { Schema, Model } from 'mongoose';
import { IEnrollment } from './enrollment.types';
import { auditPlugin } from '../../core/plugins/auditPlugin';
import { softDeletePlugin } from '../../core/plugins/softDeletePlugin';

const enrollmentSchema = new Schema<IEnrollment>({
  student: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  courseOffering: { type: Schema.Types.ObjectId, ref: 'CourseOffering', required: true },
  isElective: { type: Boolean, default: false },
  status: { type: String, enum: ['active', 'dropped'], default: 'active' }
}, { timestamps: true });

// Attach plugins
enrollmentSchema.plugin(auditPlugin);
enrollmentSchema.plugin(softDeletePlugin);

// Indexes
enrollmentSchema.index({ student: 1, courseOffering: 1 }, { unique: true });
enrollmentSchema.index({ courseOffering: 1 });
enrollmentSchema.index({ student: 1 });

export const EnrollmentModel: Model<IEnrollment> = mongoose.model<IEnrollment>('Enrollment', enrollmentSchema);
