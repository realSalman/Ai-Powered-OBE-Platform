import mongoose, { Schema, Model } from 'mongoose';
import { IAttainmentConfig } from './attainment-config.types';
import { auditPlugin } from '../../core/plugins/auditPlugin';
import { softDeletePlugin } from '../../core/plugins/softDeletePlugin';

const examWeightSchema = new Schema({
  examName: { type: String, required: true },
  weight: { type: Number, required: true, min: 0, max: 100 }
}, { _id: false });

const attainmentConfigSchema = new Schema<IAttainmentConfig>({
  department: { type: Schema.Types.ObjectId, ref: 'Department', required: true, unique: true },
  studentPassThreshold: { type: Number, required: true, min: 0, max: 100 },
  level3Threshold: { type: Number, required: true, min: 0, max: 100 },
  level2Threshold: { type: Number, required: true, min: 0, max: 100 },
  level1Threshold: { type: Number, required: true, min: 0, max: 100 },
  examWeights: [examWeightSchema],
  isConfigured: { type: Boolean, default: false }
}, { timestamps: true });

// Attach plugins
attainmentConfigSchema.plugin(auditPlugin);
attainmentConfigSchema.plugin(softDeletePlugin);

// Validation to ensure Level 3 > Level 2 > Level 1
attainmentConfigSchema.pre('save', function (this: any) {
  if (this.level3Threshold <= this.level2Threshold) {
    throw new Error('Level 3 threshold must be greater than Level 2 threshold');
  }
  if (this.level2Threshold <= this.level1Threshold) {
    throw new Error('Level 2 threshold must be greater than Level 1 threshold');
  }
});



export const AttainmentConfigModel: Model<IAttainmentConfig> = mongoose.model<IAttainmentConfig>(
  'AttainmentConfig',
  attainmentConfigSchema
);
