import mongoose, { Schema } from 'mongoose';
import { getRequestUserId } from '../middleware/requestContext';

export function auditPlugin(schema: Schema) {
  schema.add({
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  });

  schema.pre('save', function (this: any) {
    const userId = getRequestUserId();
    const actorId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
    
    if (this.isNew && !this.get('createdBy')) {
      this.set('createdBy', actorId);
    }
    this.set('updatedBy', actorId);
  });

  const updateHooks = ['findOneAndUpdate', 'updateMany', 'updateOne'];
  updateHooks.forEach((hook) => {
    schema.pre(hook as any, function (this: any) {
      const userId = getRequestUserId();
      const actorId = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : null;
      
      const update = this.getUpdate() as any;
      if (update) {
        if (!update.$set) {
          update.$set = {};
        }
        update.$set.updatedBy = actorId;
      }
    });
  });
}
