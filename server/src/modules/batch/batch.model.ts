import mongoose, { Schema, Model } from 'mongoose';
import { IBatch } from './batch.types';
import { auditPlugin } from '../../core/plugins/auditPlugin';
import { softDeletePlugin } from '../../core/plugins/softDeletePlugin';

const batchSchema = new Schema<IBatch>({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, trim: true },
  department: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
  program: { type: Schema.Types.ObjectId, ref: 'Program', default: null },
  sections: { type: [String], default: [] },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

// Attach plugins
batchSchema.plugin(auditPlugin);
batchSchema.plugin(softDeletePlugin);

// Indexes
batchSchema.index({ code: 1, department: 1 }, { unique: true });
batchSchema.index({ department: 1 });
batchSchema.index({ program: 1 }, { sparse: true });
batchSchema.index({ isActive: 1 });

export const BatchModel: Model<IBatch> = mongoose.model<IBatch>('Batch', batchSchema);
