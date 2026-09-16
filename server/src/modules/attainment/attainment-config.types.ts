import { Types } from 'mongoose';
import { ISoftDeleteSchema } from '../../core/plugins/softDeletePlugin';

export interface IExamWeightEntry {
  examName: string;    // e.g., "Mid", "Final"
  weight: number;      // e.g., 40, 60 (sum must be 100)
}

export interface IAttainmentConfig extends ISoftDeleteSchema {
  _id: Types.ObjectId;
  department: Types.ObjectId;          // unique per department
  studentPassThreshold: number;        // slider value, no default
  level3Threshold: number;             // slider value, no default
  level2Threshold: number;             // slider value, no default
  level1Threshold: number;             // slider value, no default
  examWeights: IExamWeightEntry[];     // optional, for weighted offering-level
  isConfigured: boolean;               // true once all sliders are set
  createdBy: Types.ObjectId | null;
  updatedBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}
