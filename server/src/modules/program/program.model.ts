import mongoose, { Schema, Model } from 'mongoose';
import { IProgram } from './program.types';
import { auditPlugin } from '../../core/plugins/auditPlugin';
import { softDeletePlugin } from '../../core/plugins/softDeletePlugin';

const programOutcomeSchema = new Schema({
  code: { type: String, required: true },
  description: { type: String, required: true }
}, { _id: false });

const programSchema = new Schema<IProgram>({
  code: { type: String, required: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  department: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
  programOutcomes: [programOutcomeSchema],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Attach plugins
programSchema.plugin(auditPlugin);
programSchema.plugin(softDeletePlugin);

// Indexes
programSchema.index({ code: 1, department: 1 }, { unique: true });
programSchema.index({ department: 1 });
programSchema.index({ isActive: 1 });

export const ProgramModel: Model<IProgram> = mongoose.model<IProgram>('Program', programSchema);
