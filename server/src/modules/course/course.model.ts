import mongoose, { Schema, Model } from 'mongoose';
import { ICourse } from './course.types';
import { auditPlugin } from '../../core/plugins/auditPlugin';
import { softDeletePlugin } from '../../core/plugins/softDeletePlugin';

const courseOutcomeSchema = new Schema({
  code: { type: String, required: true },
  description: { type: String, required: true },
  bloomLevel: { type: String, enum: ['Remember','Understand','Apply','Analyze','Evaluate','Create'], required: true },
}, { _id: false });

const coPoMappingSchema = new Schema({
  co: { type: String, required: true },
  po: { type: String, required: true },
  weight: { type: Number, enum: [1, 2, 3], required: true },
}, { _id: false });




const courseSchema = new Schema<ICourse>({
  code: { type: String, required: true, uppercase: true, trim: true },
  title: { type: String, required: true, trim: true },
  credits: { type: Number, required: true },
  type: { type: String, enum: ['theory', 'lab', 'project'], required: true },
  department: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
  program: { type: Schema.Types.ObjectId, ref: 'Program', default: null },
  courseOutcomes: [courseOutcomeSchema],
  coPoMapping: [coPoMappingSchema],

  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Attach plugins
courseSchema.plugin(auditPlugin);
courseSchema.plugin(softDeletePlugin);

// Indexes
courseSchema.index({ code: 1, department: 1 }, { unique: true });
courseSchema.index({ department: 1, isActive: 1 });
courseSchema.index({ program: 1 }, { sparse: true });

export const CourseModel: Model<ICourse> = mongoose.model<ICourse>('Course', courseSchema);
