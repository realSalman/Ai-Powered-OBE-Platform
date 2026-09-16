import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

import User from './src/models/User';
import { DepartmentModel } from './src/modules/department/department.model';
import admin from './src/config/firebase';

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/atlasai');
  console.log('Connected to DB');
  
  // Get raw documents to bypass schema casting on find
  const users = await mongoose.connection.db.collection('users').find({}).toArray();
  const depts = await DepartmentModel.find().lean();
  let updated = 0;
  
  for (const user of users) {
    if (user.department && !mongoose.Types.ObjectId.isValid(user.department)) {
      console.log('Fixing user', user.email, 'dept:', user.department);
      // It's probably a string code like 'CSE' or full name
      const dept = depts.find(d => d.code === user.department || d.name === user.department);
      if (dept) {
        await mongoose.connection.db.collection('users').updateOne(
          { _id: user._id }, 
          { $set: { department: dept._id } }
        );
        updated++;
        // Also clear Firebase claims to force refresh
        try {
          const fbUser = await admin.auth().getUserByEmail(user.email);
          await admin.auth().setCustomUserClaims(fbUser.uid, null);
          console.log('Cleared claims for', user.email);
        } catch(e: any) {
          console.log('Could not clear claims:', e.message);
        }
      }
    }
  }
  
  console.log('Migration complete. Updated:', updated);
  process.exit(0);
}
migrate().catch(console.error);
