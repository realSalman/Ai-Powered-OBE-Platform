import mongoose, { Schema } from 'mongoose';
import { getRequestUserId } from '../middleware/requestContext';

export interface ISoftDeleteSchema {
  isDeleted: boolean;
  deletedAt: Date | null;
  deletedBy: mongoose.Types.ObjectId | null;
}

export function softDeletePlugin(schema: Schema) {
  schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  });

  const queryMethods = ['find', 'findOne', 'findOneAndUpdate', 'countDocuments'];
  
  queryMethods.forEach((method) => {
    schema.pre(method as any, function (this: any) {
      if (!this._includeDeleted) {
        this.where({ isDeleted: { $ne: true } });
      }
    });
  });

  schema.pre('aggregate', function (this: any) {
    if (!this._includeDeleted) {
      this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
    }
  });

  (schema.query as any).includeDeleted = function (this: any) {
    this._includeDeleted = true;
    return this;
  };

  schema.methods.softDelete = async function (this: any) {
    const userId = getRequestUserId();
    const actorId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
    
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = actorId;
    return this.save();
  };

  schema.methods.restore = async function (this: any) {
    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    return this.save();
  };
}
