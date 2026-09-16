import { Express } from 'express';
import authRoutes from '../routes/authRoutes';
import adminRoutes from '../routes/adminRoutes';
import departmentRoutes from './department/department.routes';
import programRoutes from './program/program.routes';
import semesterRoutes from './semester/semester.routes';
import batchRoutes from './batch/batch.routes';
import courseRoutes from './course/course.routes';
import sectionAssignmentRoutes from './section-assignment/sectionAssignment.routes';
import offeringRoutes from './offering/offering.routes';
import enrollmentRoutes from './enrollment/enrollment.routes';
import examRoutes from './exam/exam.routes';
import marksRoutes from './marks/marks.routes';
import attainmentRoutes from './attainment/attainment.routes';
import aiRoutes from './ai/ai.routes';
import studentInsightsRoutes from './student-insights/studentInsights.routes';

export const registerRoutes = (app: Express) => {
  app.use('/api/auth', authRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/departments', departmentRoutes);
  app.use('/api/programs', programRoutes);
  app.use('/api/semesters', semesterRoutes);
  app.use('/api/batches', batchRoutes);
  app.use('/api/courses', courseRoutes);
  app.use('/api/section-assignments', sectionAssignmentRoutes);
  app.use('/api/offerings', offeringRoutes);
  app.use('/api/enrollments', enrollmentRoutes);
  app.use('/api/exams', examRoutes);
  app.use('/api/marks', marksRoutes);
  app.use('/api/attainment', attainmentRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/student-insights', studentInsightsRoutes);
};





