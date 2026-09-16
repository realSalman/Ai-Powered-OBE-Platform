import mongoose from 'mongoose';
import connectDB from '../config/db';
import User from '../models/User';
import { DepartmentModel } from '../modules/department/department.model';

async function run() {
  await connectDB();
  console.log('Connected to MongoDB');

  const users = await User.find({}).lean();
  console.log(`Found ${users.length} users in total.`);

  let migratedCount = 0;

  for (const user of users) {
    const deptVal = user.department;
    if (!deptVal) continue;

    const deptStr = deptVal.toString().trim();

    // If it's already a valid ObjectId hex string, skip
    if (mongoose.Types.ObjectId.isValid(deptStr)) {
      continue;
    }

    console.log(`Migrating department for user "${user.name}" (${user.email}): Current value: "${deptStr}"`);

    // Look up the department by code/name
    const matchedDept = await DepartmentModel.findOne({
      $or: [
        { code: { $regex: new RegExp(`^${deptStr}$`, 'i') } },
        { name: { $regex: new RegExp(`^${deptStr}$`, 'i') } },
        { name: { $regex: new RegExp(deptStr.split(' ')[0], 'i') } } // Fallback to first word (e.g. "Computer" matches "Computer Science & Engineering")
      ]
    }).lean();

    if (matchedDept) {
      console.log(`  -> Found matching department: "${matchedDept.name}" (${matchedDept.code}) with ID: ${matchedDept._id}`);
      await User.updateOne(
        { _id: user._id },
        { $set: { department: matchedDept._id } }
      );
      migratedCount++;
    } else {
      console.warn(`  -> WARNING: No matching department found for "${deptStr}"`);
    }
  }

  console.log(`\nMigration completed. Updated ${migratedCount} users.`);
  await mongoose.connection.close();
}

run().catch(error => {
  console.error('Migration failed:', error);
  mongoose.connection.close();
});
