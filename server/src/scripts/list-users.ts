import mongoose from 'mongoose';
import connectDB from '../config/db';
import User from '../models/User';

async function run() {
  await connectDB();
  console.log('Connected to MongoDB');
  
  const depts = await (mongoose.connection.db as any).collection('departments').find({}).toArray();
  console.log('\n--- DEPARTMENTS ---');
  depts.forEach((d: any) => {
    console.log(`- ID: ${d._id}, Code: "${d.code}", Name: "${d.name}"`);
  });

  const users = await User.find({}).lean();
  console.log('\n--- USERS ---');
  users.forEach(u => {
    console.log(`- ID: ${u._id}, Name: "${u.name}", Email: "${u.email}", Roles: ${JSON.stringify(u.roles)}, Department: ${u.department}`);
  });

  const offerings = await (mongoose.connection.db as any).collection('courseofferings').find({}).toArray();
  console.log('\n--- COURSE OFFERINGS ---');
  offerings.forEach((o: any) => {
    console.log(`- ID: ${o._id}, Course: "${o.courseCode}", Section: "${o.section}", Teacher: "${o.teacherName}" (${o.teacherInitial}), Department: "${o.department}"`);
  });
  
  await mongoose.connection.close();
}

run().catch(console.error);
