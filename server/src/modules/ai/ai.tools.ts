import mongoose, { Types } from 'mongoose';
import { AIToolDefinition } from './ai.types';
import { StudentMarkModel } from '../marks/marks.model';
import { ExamModel } from '../exam/exam.model';
import { CourseOfferingModel } from '../offering/offering.model';
import { EnrollmentModel } from '../enrollment/enrollment.model';
import { MarksService } from '../marks/marks.service';
import { AttainmentService } from '../attainment/attainment.service';
import { EnrollmentService } from '../enrollment/enrollment.service';
import { ForbiddenError, NotFoundError, ValidationError } from '../../core/errors';

const marksService = new MarksService();
const attainmentService = new AttainmentService();
const enrollmentService = new EnrollmentService();

// ─── TOOL DEFINITIONS ────────────────────────────────────────────────────────

export const aiTools: AIToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_student_marks',
      description: "Retrieve marks for a specific student, optionally filtered by a course offering.",
      parameters: {
        type: 'object',
        properties: {
          studentId: {
            type: 'string',
            description: "The unique identifier (ObjectId) of the student."
          },
          courseOfferingId: {
            type: 'string',
            description: "Optional course offering identifier (ObjectId) to filter marks."
          }
        },
        required: ['studentId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_exam_summary',
      description: "Retrieve statistical summary (average, median, standard deviation, pass rate) for a specific exam.",
      parameters: {
        type: 'object',
        properties: {
          examId: {
            type: 'string',
            description: "The unique identifier (ObjectId) of the exam."
          }
        },
        required: ['examId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_offering_attainment',
      description: "Get CO and PO attainment analysis for a specific course offering.",
      parameters: {
        type: 'object',
        properties: {
          offeringId: {
            type: 'string',
            description: "The unique identifier (ObjectId) of the course offering."
          }
        },
        required: ['offeringId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_exam_attainment',
      description: "Get CO attainment analysis for a specific exam.",
      parameters: {
        type: 'object',
        properties: {
          examId: {
            type: 'string',
            description: "The unique identifier (ObjectId) of the exam."
          }
        },
        required: ['examId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_batch_attainment',
      description: "Get batch PO attainment analysis for a specific batch and semester.",
      parameters: {
        type: 'object',
        properties: {
          batchId: {
            type: 'string',
            description: "The unique identifier (ObjectId) of the batch."
          },
          semesterId: {
            type: 'string',
            description: "The unique identifier (ObjectId) of the semester."
          }
        },
        required: ['batchId', 'semesterId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_department_attainment',
      description: "Get department-wide PO attainment analysis for a specific department and semester.",
      parameters: {
        type: 'object',
        properties: {
          deptId: {
            type: 'string',
            description: "The unique identifier (ObjectId) of the department."
          },
          semesterId: {
            type: 'string',
            description: "The unique identifier (ObjectId) of the semester."
          }
        },
        required: ['deptId', 'semesterId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_student_enrollments',
      description: "Get all active course offering enrollments for a specific student.",
      parameters: {
        type: 'object',
        properties: {
          studentId: {
            type: 'string',
            description: "The unique identifier (ObjectId) of the student."
          }
        },
        required: ['studentId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_at_risk_students',
      description: "Identify students enrolled in a course offering whose performance is below a threshold (default 50%).",
      parameters: {
        type: 'object',
        properties: {
          offeringId: {
            type: 'string',
            description: "The unique identifier (ObjectId) of the course offering."
          },
          thresholdPercentage: {
            type: 'number',
            description: "Percentage threshold below which a student is flagged at-risk (default 50)."
          }
        },
        required: ['offeringId']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_class_mark_distribution',
      description: "Retrieve mark distribution histogram buckets and basic stats for a specific exam in a course offering.",
      parameters: {
        type: 'object',
        properties: {
          offeringId: {
            type: 'string',
            description: "The unique identifier (ObjectId) of the course offering."
          },
          examId: {
            type: 'string',
            description: "The unique identifier (ObjectId) of the exam."
          }
        },
        required: ['offeringId', 'examId']
      }
    }
  }
];

// ─── HELPER SCOPING CHECKS ───────────────────────────────────────────────────

async function checkOfferingAccess(offeringId: string, userId: string, role: string, deptScope: string | null) {
  const offering = await CourseOfferingModel.findOne({ _id: offeringId, isDeleted: false });
  if (!offering) {
    throw new NotFoundError('CourseOffering', offeringId);
  }

  if (role === 'student') {
    // Check if enrolled
    const enrollment = await EnrollmentModel.findOne({ student: userId, courseOffering: offeringId, isDeleted: false });
    if (!enrollment) {
      throw new ForbiddenError("Access Denied: You are not enrolled in this course offering");
    }
  } else if (role === 'faculty') {
    // Check if teacher
    if (offering.teacher?.toString() !== userId) {
      throw new ForbiddenError("Access Denied: You are not assigned as the teacher for this course offering");
    }
  } else if (deptScope) {
    // Check if department matches
    if (offering.department?.toString() !== deptScope) {
      throw new ForbiddenError("Access Denied: Course offering does not belong to your department scope");
    }
  }
}

async function checkExamAccess(examId: string, userId: string, role: string, deptScope: string | null) {
  const exam = await ExamModel.findOne({ _id: examId, isDeleted: false });
  if (!exam) {
    throw new NotFoundError('Exam', examId);
  }
  await checkOfferingAccess(exam.courseOffering.toString(), userId, role, deptScope);
}

// ─── TOOL EXECUTION HANDLER ──────────────────────────────────────────────────

export async function executeTool(
  name: string,
  args: any,
  userId: string,
  role: string,
  deptScope: string | null
): Promise<any> {
  switch (name) {
    case 'get_student_marks': {
      let { studentId, courseOfferingId } = args;
      
      // Strict role scoping
      if (role === 'student') {
        studentId = userId; // students can only view themselves
      }
      
      if (courseOfferingId) {
        await checkOfferingAccess(courseOfferingId, userId, role, deptScope);
        return await marksService.getMarksByStudent(studentId, courseOfferingId);
      } else {
        // Find all active marks for this student
        const filter: any = { student: studentId, isDeleted: false };
        
        if (role === 'faculty') {
          // Faculty can only see marks for offerings they teach
          const offerings = await CourseOfferingModel.find({ teacher: userId, isDeleted: false }).distinct('_id');
          filter.courseOffering = { $in: offerings };
        } else if (deptScope) {
          // Dept-scoped admins
          const offerings = await CourseOfferingModel.find({ department: deptScope, isDeleted: false }).distinct('_id');
          filter.courseOffering = { $in: offerings };
        }
        
        return await StudentMarkModel.find(filter)
          .populate({ path: 'exam', select: 'name totalMarks questions' })
          .populate({ path: 'courseOffering', select: 'courseCode courseTitle section' })
          .lean();
      }
    }

    case 'get_exam_summary': {
      const { examId } = args;
      await checkExamAccess(examId, userId, role, deptScope);
      return await marksService.getMarksSummary(examId);
    }

    case 'get_offering_attainment': {
      const { offeringId } = args;
      await checkOfferingAccess(offeringId, userId, role, deptScope);
      return await attainmentService.computeOfferingAttainment(offeringId);
    }

    case 'get_exam_attainment': {
      const { examId } = args;
      await checkExamAccess(examId, userId, role, deptScope);
      return await attainmentService.computeExamAttainment(examId);
    }

    case 'get_batch_attainment': {
      const { batchId, semesterId } = args;
      
      if (role === 'student' || role === 'faculty') {
        throw new ForbiddenError("Access Denied: Role does not have permissions to query batch attainment");
      }
      
      if (deptScope) {
        // Ensure batch/dept bounds
        const batch = await mongoose.model('Batch').findOne({ _id: batchId, department: deptScope });
        if (!batch) {
          throw new ForbiddenError("Access Denied: Batch does not belong to your department scope");
        }
      }
      
      return await attainmentService.computeBatchAttainment(batchId, semesterId);
    }

    case 'get_department_attainment': {
      const { deptId, semesterId } = args;
      
      if (role === 'student' || role === 'faculty') {
        throw new ForbiddenError("Access Denied: Role does not have permissions to query department attainment");
      }
      
      if (deptScope && deptScope !== deptId) {
        throw new ForbiddenError("Access Denied: You can only access your own department's attainment");
      }
      
      return await attainmentService.computeDepartmentAttainment(deptId, semesterId);
    }

    case 'get_student_enrollments': {
      let { studentId } = args;
      
      if (role === 'student') {
        studentId = userId;
      }
      
      const queryParams: any = { student: studentId };
      const enrollResult = await enrollmentService.list(queryParams, deptScope, { _id: userId, roles: [role] });
      return enrollResult.data;
    }

    case 'get_at_risk_students': {
      const { offeringId, thresholdPercentage = 50 } = args;
      await checkOfferingAccess(offeringId, userId, role, deptScope);
      
      // Get all active exams for this offering
      const exams = await ExamModel.find({ courseOffering: offeringId, isDeleted: false }).lean();
      if (!exams.length) {
        return { message: "No exams found for this offering to compute risk metrics." };
      }
      
      // Get enrollments to know the active student list
      const enrollments = await EnrollmentModel.find({ courseOffering: offeringId, isDeleted: false })
        .populate('student', 'name studentId email')
        .lean();
        
      if (!enrollments.length) {
        return { message: "No students enrolled in this offering." };
      }
      
      // Fetch all marks for these exams
      const examIds = exams.map(e => e._id);
      const allMarks = await StudentMarkModel.find({ exam: { $in: examIds }, isDeleted: false }).lean();
      
      const atRiskList: any[] = [];
      const totalPossibleMarks = exams.reduce((sum, e) => sum + e.totalMarks, 0);
      
      for (const enroll of enrollments) {
        const student = enroll.student as any;
        if (!student) continue;
        
        const studentMarks = allMarks.filter(m => m.student.toString() === student._id.toString());
        const totalObtained = studentMarks.reduce((sum, m) => sum + m.totalObtained, 0);
        
        // Sum total marks for exams the student actually had graded
        const gradedExams = exams.filter(e => studentMarks.some(m => m.exam.toString() === e._id.toString()));
        const studentPossibleMarks = gradedExams.reduce((sum, e) => sum + e.totalMarks, 0);
        
        const percentage = studentPossibleMarks > 0 ? (totalObtained / studentPossibleMarks) * 100 : 0;
        
        if (studentPossibleMarks > 0 && percentage < thresholdPercentage) {
          atRiskList.push({
            studentId: student.studentId,
            name: student.name,
            totalObtained,
            possibleMarks: studentPossibleMarks,
            percentage: Math.round(percentage * 100) / 100,
            missingExamsCount: exams.length - gradedExams.length,
            exams: studentMarks.map(m => {
              const examObj = exams.find(e => e._id.toString() === m.exam.toString());
              return {
                examName: examObj?.name || 'Unknown',
                obtained: m.totalObtained,
                total: examObj?.totalMarks || 0
              };
            })
          });
        }
      }
      
      // Sort at-risk students starting with the lowest percentage
      atRiskList.sort((a, b) => a.percentage - b.percentage);
      
      // Apply budget restriction: max 50 students
      return {
        thresholdPercentage,
        totalEnrolled: enrollments.length,
        totalAtRisk: atRiskList.length,
        atRiskStudents: atRiskList.slice(0, 50)
      };
    }

    case 'get_class_mark_distribution': {
      const { offeringId, examId } = args;
      await checkOfferingAccess(offeringId, userId, role, deptScope);
      await checkExamAccess(examId, userId, role, deptScope);
      
      const exam = await ExamModel.findOne({ _id: examId, isDeleted: false }).lean();
      if (!exam) {
        throw new NotFoundError('Exam', examId);
      }
      
      const marks = await StudentMarkModel.find({ exam: examId, isDeleted: false }).lean();
      if (!marks.length) {
        return { message: "No marks submitted for this exam yet." };
      }
      
      const totalMarks = exam.totalMarks;
      const scores = marks.map(m => m.totalObtained);
      scores.sort((a, b) => a - b);
      
      const sum = scores.reduce((a, b) => a + b, 0);
      const average = sum / scores.length;
      const min = scores[0];
      const max = scores[scores.length - 1];
      
      // Median
      let median = 0;
      const mid = Math.floor(scores.length / 2);
      if (scores.length % 2 !== 0) {
        median = scores[mid];
      } else {
        median = (scores[mid - 1] + scores[mid]) / 2;
      }
      
      // Histogram buckets (10% intervals)
      const bucketCounts: Record<string, number> = {
        '0-10%': 0, '10-20%': 0, '20-30%': 0, '30-40%': 0, '40-50%': 0,
        '50-60%': 0, '60-70%': 0, '70-80%': 0, '80-90%': 0, '90-100%': 0
      };
      
      scores.forEach(score => {
        const pct = (score / totalMarks) * 100;
        if (pct >= 90) bucketCounts['90-100%']++;
        else if (pct >= 80) bucketCounts['80-90%']++;
        else if (pct >= 70) bucketCounts['70-80%']++;
        else if (pct >= 60) bucketCounts['60-70%']++;
        else if (pct >= 50) bucketCounts['50-60%']++;
        else if (pct >= 40) bucketCounts['40-50%']++;
        else if (pct >= 30) bucketCounts['30-40%']++;
        else if (pct >= 20) bucketCounts['20-30%']++;
        else if (pct >= 10) bucketCounts['10-20%']++;
        else bucketCounts['0-10%']++;
      });
      
      return {
        examName: exam.name,
        totalMarks,
        stats: {
          totalStudents: scores.length,
          average: Math.round(average * 100) / 100,
          median: Math.round(median * 100) / 100,
          min,
          max,
        },
        distribution: bucketCounts
      };
    }

    default:
      throw new ValidationError({ tool: `Unknown tool name: ${name}` });
  }
}
