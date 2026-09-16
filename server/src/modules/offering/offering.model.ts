import mongoose, { Schema, Model } from 'mongoose';
import { ICourseOffering } from './offering.types';
import { auditPlugin } from '../../core/plugins/auditPlugin';
import { softDeletePlugin } from '../../core/plugins/softDeletePlugin';

const courseOfferingSchema = new Schema<ICourseOffering>({
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  semester: { type: Schema.Types.ObjectId, ref: 'Semester', required: true },
  batch: { type: Schema.Types.ObjectId, ref: 'Batch', required: true },
  department: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
  section: { type: String, required: true, uppercase: true, trim: true },
  teacher: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  courseCode: { type: String, required: true, trim: true, uppercase: true },
  courseTitle: { type: String, required: true, trim: true },
  semesterName: { type: String, required: true, trim: true },
  teacherName: { type: String, default: null, trim: true },
  teacherInitial: { type: String, default: null, trim: true, uppercase: true },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Attach plugins
courseOfferingSchema.plugin(auditPlugin);
courseOfferingSchema.plugin(softDeletePlugin);

// Indexes
courseOfferingSchema.index({ course: 1, semester: 1, batch: 1, section: 1 }, { unique: true });
courseOfferingSchema.index({ semester: 1, teacher: 1 });
courseOfferingSchema.index({ batch: 1 });
courseOfferingSchema.index({ department: 1 });
courseOfferingSchema.index({ courseCode: 1 });
courseOfferingSchema.index({ isActive: 1 });

export const CourseOfferingModel: Model<ICourseOffering> = mongoose.model<ICourseOffering>('CourseOffering', courseOfferingSchema);
