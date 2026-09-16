import mongoose from 'mongoose';
import connectDB from '../config/db';
import User, { UserRole } from '../models/User';
import { DepartmentModel } from '../modules/department/department.model';
import { ProgramModel } from '../modules/program/program.model';
import { SemesterModel } from '../modules/semester/semester.model';
import { BatchModel } from '../modules/batch/batch.model';
import { CourseModel } from '../modules/course/course.model';
import { SectionAssignmentModel } from '../modules/section-assignment/sectionAssignment.model';
import { CourseOfferingModel } from '../modules/offering/offering.model';
import { EnrollmentModel } from '../modules/enrollment/enrollment.model';
import { ExamModel } from '../modules/exam/exam.model';
import { CourseOfferingService } from '../modules/offering/offering.service';
import { EnrollmentService } from '../modules/enrollment/enrollment.service';
import { ExamService } from '../modules/exam/exam.service';
import { logger } from '../core/utils/logger';

const seed = async () => {
  try {
    await connectDB();
    logger.info('Connected to MongoDB for seeding...');

    // 1. Purge existing data
    logger.info('Purging old data...');
    await User.deleteMany({});
    await DepartmentModel.deleteMany({});
    await ProgramModel.deleteMany({});
    await SemesterModel.deleteMany({});
    await BatchModel.deleteMany({});
    await CourseModel.deleteMany({});
    await SectionAssignmentModel.deleteMany({});
    await CourseOfferingModel.deleteMany({});
    await EnrollmentModel.deleteMany({});
    await ExamModel.deleteMany({});
    logger.info('Purge completed.');

    // 2. Create Users
    logger.info('Creating users...');
    const admin = await User.create({
      email: 'admin@atlasai.edu',
      name: 'System Admin',
      roles: [UserRole.ADMIN],
    });

    const supervisor = await User.create({
      email: 'supervisor@atlasai.edu',
      name: 'Academic Supervisor',
      roles: [UserRole.SUPERVISOR],
      department: 'CSE',
    });

    const faculty1 = await User.create({
      email: 'faculty1@atlasai.edu',
      name: 'Dr. John Doe',
      roles: [UserRole.FACULTY],
      department: 'CSE',
      teacherInitial: 'JD',
    });

    const faculty2 = await User.create({
      email: 'faculty2@atlasai.edu',
      name: 'Prof. Sarah Smith',
      roles: [UserRole.FACULTY],
      department: 'CSE',
      teacherInitial: 'SS',
    });

    const faculty3 = await User.create({
      email: 'faculty3@atlasai.edu',
      name: 'Dr. Alan Turing',
      roles: [UserRole.FACULTY],
      department: 'EEE',
      teacherInitial: 'AT',
    });

    const student1 = await User.create({
      email: 'student1@atlasai.edu',
      name: 'Alice Johnson',
      roles: [UserRole.STUDENT],
      department: 'CSE',
      studentId: 'CSE-055-001',
      batch: '55',
    });

    const student2 = await User.create({
      email: 'student2@atlasai.edu',
      name: 'Bob Miller',
      roles: [UserRole.STUDENT],
      department: 'CSE',
      studentId: 'CSE-055-002',
      batch: '55',
    });

    const student3 = await User.create({
      email: 'student3@atlasai.edu',
      name: 'Charlie Davis',
      roles: [UserRole.STUDENT],
      department: 'EEE',
      studentId: 'EEE-021-001',
      batch: '21',
    });
    logger.info('Users created.');

    // 3. Create Departments
    logger.info('Creating departments...');
    const cseDept = await DepartmentModel.create({
      code: 'CSE',
      name: 'Computer Science & Engineering',
      hasPrograms: true, // PO is defined per program
      programOutcomes: [],
    });

    const eeeDept = await DepartmentModel.create({
      code: 'EEE',
      name: 'Electrical & Electronic Engineering',
      hasPrograms: false, // PO is defined per department
      programOutcomes: [
        { code: 'PO1', description: 'Apply engineering knowledge to solve problems' },
        { code: 'PO2', description: 'Analyze complex electrical systems' },
        { code: 'PO3', description: 'Design circuit prototypes' },
      ],
    });
    logger.info('Departments created.');

    // 4. Create Programs (for CSE)
    logger.info('Creating programs...');
    const bscsProg = await ProgramModel.create({
      code: 'BSCS',
      name: 'Bachelor of Science in Computer Science',
      department: cseDept._id,
      programOutcomes: [
        { code: 'PO1', description: 'Apply mathematical foundations and algorithmic principles' },
        { code: 'PO2', description: 'Analyze computing problems and define requirements' },
        { code: 'PO3', description: 'Design, implement, and evaluate computer-based systems' },
        { code: 'PSO1', description: 'Specialize in Artificial Intelligence and Machine Learning' },
      ],
    });
    logger.info('Programs created.');

    // 5. Create Semesters
    logger.info('Creating semesters...');
    const springSemester = await SemesterModel.create({
      name: 'Spring 2026',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-06-30'),
      status: 'active',
    });
    logger.info('Semester created.');

    // 6. Create Batches
    logger.info('Creating batches...');
    const cseBatch = await BatchModel.create({
      name: 'Batch 55 (CSE)',
      code: '55',
      department: cseDept._id,
      program: bscsProg._id,
      sections: ['A', 'B', 'C'],
    });

    const eeeBatch = await BatchModel.create({
      name: 'Batch 21 (EEE)',
      code: '21',
      department: eeeDept._id,
      sections: ['A', 'B'],
    });
    logger.info('Batches created.');

    // 7. Create Courses
    logger.info('Creating courses...');
    // CSE 101 Course
    const cse101 = await CourseModel.create({
      code: 'CSE101',
      title: 'Introduction to Programming',
      credits: 3,
      type: 'theory',
      department: cseDept._id,
      program: bscsProg._id,
      courseOutcomes: [
        { code: 'CO1', description: 'Understand basic programming constructs like loops and branches', bloomLevel: 'Understand' },
        { code: 'CO2', description: 'Apply procedural programming principles to build small utilities', bloomLevel: 'Apply' },
        { code: 'CO3', description: 'Analyze source code complexity and write clean code', bloomLevel: 'Analyze' },
      ],
      coPoMapping: [
        { co: 'CO1', po: 'PO1', weight: 3 },
        { co: 'CO2', po: 'PO3', weight: 2 },
        { co: 'CO3', po: 'PO2', weight: 2 },
      ],

    });
 
    // CSE 101L Lab Course
    const cse101L = await CourseModel.create({
      code: 'CSE101L',
      title: 'Introduction to Programming Lab',
      credits: 1,
      type: 'lab',
      department: cseDept._id,
      program: bscsProg._id,
      courseOutcomes: [
        { code: 'CO1', description: 'Develop code for basic algorithms in C++', bloomLevel: 'Create' },
        { code: 'CO2', description: 'Debug and test syntax and logical errors', bloomLevel: 'Apply' },
      ],
      coPoMapping: [
        { co: 'CO1', po: 'PO3', weight: 3 },
        { co: 'CO2', po: 'PO2', weight: 2 },
      ],

    });
 
    // EEE 101 Course
    const eee101 = await CourseModel.create({
      code: 'EEE101',
      title: 'Electrical Circuits',
      credits: 3,
      type: 'theory',
      department: eeeDept._id,
      courseOutcomes: [
        { code: 'CO1', description: 'Apply Ohm\'s Law and Kirchhoff\'s laws to solve circuit issues', bloomLevel: 'Apply' },
        { code: 'CO2', description: 'Evaluate AC circuit responses and node voltages', bloomLevel: 'Evaluate' },
      ],
      coPoMapping: [
        { co: 'CO1', po: 'PO1', weight: 3 },
        { co: 'CO2', po: 'PO2', weight: 2 },
      ],

    });
    logger.info('Courses created.');

    // 8. Assign Sections to Students for the semester
    logger.info('Assigning students to sections for Spring 2026...');
    await SectionAssignmentModel.create({
      student: student1._id,
      semester: springSemester._id,
      batch: cseBatch._id,
      section: 'A',
    });

    await SectionAssignmentModel.create({
      student: student2._id,
      semester: springSemester._id,
      batch: cseBatch._id,
      section: 'B', // Student 2 is in Section B
    });

    await SectionAssignmentModel.create({
      student: student3._id,
      semester: springSemester._id,
      batch: eeeBatch._id,
      section: 'A',
    });
    logger.info('Student section assignments created.');

    // 9. Create Course Offerings
    logger.info('Creating course offerings...');
    const offeringService = new CourseOfferingService();
    
    // Offering 1: CSE101 Section A (Dr. John Doe)
    const offering1 = await offeringService.create({
      course: cse101._id.toString(),
      semester: springSemester._id.toString(),
      batch: cseBatch._id.toString(),
      section: 'A',
      teacher: faculty1._id.toString(),
    });

    // Offering 2: CSE101 Section B (Prof. Sarah Smith)
    const offering2 = await offeringService.create({
      course: cse101._id.toString(),
      semester: springSemester._id.toString(),
      batch: cseBatch._id.toString(),
      section: 'B',
      teacher: faculty2._id.toString(),
    });

    // Offering 3: CSE101L Section A (Dr. John Doe)
    const offering3 = await offeringService.create({
      course: cse101L._id.toString(),
      semester: springSemester._id.toString(),
      batch: cseBatch._id.toString(),
      section: 'A',
      teacher: faculty1._id.toString(),
    });

    // Offering 4: EEE101 Section A (Dr. Alan Turing)
    const offering4 = await offeringService.create({
      course: eee101._id.toString(),
      semester: springSemester._id.toString(),
      batch: eeeBatch._id.toString(),
      section: 'A',
      teacher: faculty3._id.toString(),
    });
    logger.info('Course offerings created.');

    // 10. Enroll Students in Course Offerings
    logger.info('Enrolling students...');
    const enrollmentService = new EnrollmentService();

    // Student 1 (assigned to section A) -> CSE101 Section A (Regular enrollment, elective = false)
    await enrollmentService.create({
      student: student1._id.toString(),
      courseOffering: offering1._id.toString(),
    });

    // Student 1 (assigned to section A) -> CSE101L Section A (Regular enrollment, elective = false)
    await enrollmentService.create({
      student: student1._id.toString(),
      courseOffering: offering3._id.toString(),
    });

    // Student 2 (assigned to section B) -> CSE101 Section A (Cross-section elective enrollment, elective = true!)
    await enrollmentService.create({
      student: student2._id.toString(),
      courseOffering: offering1._id.toString(),
    });

    // Student 2 (assigned to section B) -> CSE101 Section B (Regular enrollment, elective = false)
    await enrollmentService.create({
      student: student2._id.toString(),
      courseOffering: offering2._id.toString(),
    });

    // Student 3 (assigned to section A) -> EEE101 Section A (Regular enrollment, elective = false)
    await enrollmentService.create({
      student: student3._id.toString(),
      courseOffering: offering4._id.toString(),
    });
    logger.info('Student enrollments completed.');



    logger.info('Database seeded successfully!');
    mongoose.connection.close();
  } catch (error) {
    logger.error(error, 'Error seeding database');
    mongoose.connection.close();
    process.exit(1);
  }
};

seed();
