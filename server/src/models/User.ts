import mongoose, { Document, Schema } from 'mongoose';

export enum UserRole {
  STUDENT = 'student',
  HOD = 'HOD',
  FACULTY = 'faculty',
  SUPERVISOR = 'supervisor',
  ADMIN = 'admin',
  SUPERADMIN = 'superadmin'
}

export interface IUser extends Document {
  email: string;
  name: string;
  roles: UserRole[];
  department?: mongoose.Types.ObjectId;
  // Student fields
  studentId?: string;
  batch?: string;
  // Faculty fields
  teacherInitial?: string;
}

const userSchema = new Schema<IUser>({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  roles: { 
    type: [String], 
    enum: Object.values(UserRole), 
    required: true 
  },
  department: { type: Schema.Types.ObjectId, ref: 'Department' },
  studentId: { 
    type: String, 
    required: function(this: IUser) { return this.roles && this.roles.includes(UserRole.STUDENT); } 
  },
  batch: { type: String },
  teacherInitial: { 
    type: String, 
    required: function(this: IUser) { return this.roles && this.roles.includes(UserRole.FACULTY); } 
  }
}, {
  timestamps: true
});

// Optimization Indexes
userSchema.index({ studentId: 1 }, { sparse: true, unique: true });
userSchema.index({ teacherInitial: 1 }, { sparse: true, unique: true });
userSchema.index({ department: 1, roles: 1 });
userSchema.index({ department: 1, batch: 1 });

const User = mongoose.model<IUser>('User', userSchema);

export default User;

