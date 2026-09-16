import { AttainmentConfigModel } from './attainment-config.model';
import { ExamModel } from '../exam/exam.model';
import { CourseOfferingModel } from '../offering/offering.model';
import { CourseModel } from '../course/course.model';
import { StudentMarkModel } from '../marks/marks.model';
import { DepartmentModel } from '../department/department.model';
import { ProgramModel } from '../program/program.model';
import { EnrollmentModel } from '../enrollment/enrollment.model';
import { NotFoundError, ValidationError, AppError } from '../../core/errors';
import mongoose, { Types } from 'mongoose';
import {
  IStudentCOScore,
  ICOAttainment,
  IPOAttainment,
  IOfferingAttainment,
  IExamAttainment,
} from './attainment.types';

export class AttainmentService {
  /**
   * Fetch configuration for a department.
   */
  async getConfig(departmentId: string) {
    const config = await AttainmentConfigModel.findOne({
      department: departmentId,
      isDeleted: false,
    }).lean();
    return config;
  }

  /**
   * Save (upsert) configuration for a department. Enforces level validations.
   */
  async saveConfig(departmentId: string, data: any, actorId: string) {
    const prepared = {
      department: new Types.ObjectId(departmentId),
      studentPassThreshold: data.studentPassThreshold,
      level3Threshold: data.level3Threshold,
      level2Threshold: data.level2Threshold,
      level1Threshold: data.level1Threshold,
      examWeights: data.examWeights || [],
      isConfigured: true,
      updatedBy: new Types.ObjectId(actorId),
    };

    const config = await AttainmentConfigModel.findOneAndUpdate(
      { department: departmentId },
      { $set: prepared },
      { upsert: true, new: true, runValidators: true }
    );
    return config;
  }

  /**
   * Internal guard to check and retrieve the department attainment config.
   * Throws a custom CONFIG_REQUIRED AppError if not configured.
   */
  private async requireConfig(departmentId: string) {
    const config = await AttainmentConfigModel.findOne({
      department: departmentId,
      isConfigured: true,
      isDeleted: false,
    }).lean();

    if (!config) {
      throw new AppError(
        400,
        'OBE attainment thresholds have not been configured for this department. Please set them first.',
        'CONFIG_REQUIRED'
      );
    }
    return config;
  }

  /**
   * Compute CO attainment for a single exam.
   */
  async computeExamAttainment(examId: string): Promise<IExamAttainment> {
    const exam = await ExamModel.findOne({ _id: examId, isDeleted: false }).lean();
    if (!exam) throw new NotFoundError('Exam', examId);

    const offering = await CourseOfferingModel.findOne({ _id: exam.courseOffering, isDeleted: false }).lean();
    if (!offering) throw new NotFoundError('CourseOffering', exam.courseOffering.toString());

    // 1. Get attainment config for department
    const config = await this.requireConfig(offering.department.toString());

    // 2. Fetch course outcomes definitions
    const course = await CourseModel.findById(offering.course).lean();
    if (!course) throw new NotFoundError('Course', offering.course.toString());

    // 3. Fetch student marks
    const studentMarks = await StudentMarkModel.find({ exam: examId, isDeleted: false }).lean();
    if (studentMarks.length === 0) {
      return {
        exam: exam._id,
        coAttainments: course.courseOutcomes.map((co) => ({
          co: co.code,
          description: co.description,
          bloomLevel: co.bloomLevel,
          totalStudents: 0,
          passingStudents: 0,
          attainmentPct: 0,
          attainmentLevel: 0,
        })),
        computedAt: new Date(),
      };
    }

    // 4. Compute student CO scores
    const coAttainments: ICOAttainment[] = [];

    for (const coDef of course.courseOutcomes) {
      const coCode = coDef.code;
      let totalStudents = studentMarks.length;
      let passingStudents = 0;

      // Filter questions mapping to this CO
      const mappingQuestions = exam.questions.filter((q) =>
        q.coMapping && q.coMapping.some((cm) => cm.co === coCode)
      );

      // If CO is not covered in this exam, skip or set as 0
      if (mappingQuestions.length === 0) {
        coAttainments.push({
          co: coCode,
          description: coDef.description,
          bloomLevel: coDef.bloomLevel,
          totalStudents: 0,
          passingStudents: 0,
          attainmentPct: 0,
          attainmentLevel: 0,
        });
        continue;
      }

      for (const sm of studentMarks) {
        let obtainedForCo = 0;
        let possibleForCo = 0;

        for (const mq of mappingQuestions) {
          const studentQMark = sm.questionMarks.find((qm) => qm.question === mq.number);
          const obtainedMarks = studentQMark ? studentQMark.marksObtained : 0;
          const coPercentage = mq.coMapping.find((cm) => cm.co === coCode)?.percentage || 0;

          obtainedForCo += obtainedMarks * (coPercentage / 100);
          possibleForCo += mq.marks * (coPercentage / 100);
        }

        const studentCoPct = possibleForCo > 0 ? (obtainedForCo / possibleForCo) * 100 : 0;
        if (studentCoPct >= config.studentPassThreshold) {
          passingStudents++;
        }
      }

      const attainmentPct = totalStudents > 0 ? (passingStudents / totalStudents) * 100 : 0;

      let attainmentLevel: 0 | 1 | 2 | 3 = 0;
      if (attainmentPct >= config.level3Threshold) {
        attainmentLevel = 3;
      } else if (attainmentPct >= config.level2Threshold) {
        attainmentLevel = 2;
      } else if (attainmentPct >= config.level1Threshold) {
        attainmentLevel = 1;
      }

      coAttainments.push({
        co: coCode,
        description: coDef.description,
        bloomLevel: coDef.bloomLevel,
        totalStudents,
        passingStudents,
        attainmentPct,
        attainmentLevel,
      });
    }

    return {
      exam: exam._id,
      coAttainments,
      computedAt: new Date(),
    };
  }

  /**
   * Compute CO attainment for a CourseOffering across all its exams.
   */
  async computeOfferingAttainment(offeringId: string): Promise<IOfferingAttainment> {
    const offering = await CourseOfferingModel.findOne({ _id: offeringId, isDeleted: false }).lean();
    if (!offering) throw new NotFoundError('CourseOffering', offeringId);

    const config = await this.requireConfig(offering.department.toString());

    const course = await CourseModel.findById(offering.course).lean();
    if (!course) throw new NotFoundError('Course', offering.course.toString());

    const exams = await ExamModel.find({ courseOffering: offeringId, isDeleted: false }).lean();
    const examIds = exams.map((e) => e._id);

    // Get all students enrolled in this offering
    const enrollments = await EnrollmentModel.find({
      courseOffering: offeringId,
      status: 'active',
      isDeleted: false,
    }).lean();
    const totalStudentsCount = enrollments.length;

    if (totalStudentsCount === 0 || exams.length === 0) {
      return {
        courseOffering: offering._id,
        coAttainments: course.courseOutcomes.map((co) => ({
          co: co.code,
          description: co.description,
          bloomLevel: co.bloomLevel,
          totalStudents: 0,
          passingStudents: 0,
          attainmentPct: 0,
          attainmentLevel: 0,
        })),
        poAttainments: [],
        config: {
          studentPassThreshold: config.studentPassThreshold,
          level3Threshold: config.level3Threshold,
          level2Threshold: config.level2Threshold,
          level1Threshold: config.level1Threshold,
        },
        computedAt: new Date(),
      };
    }

    // Load marks for all exams
    const allMarks = await StudentMarkModel.find({
      exam: { $in: examIds },
      isDeleted: false,
    }).lean();

    const coAttainments: ICOAttainment[] = [];

    // Loop through each CO defined in the course
    for (const coDef of course.courseOutcomes) {
      const coCode = coDef.code;
      let passingStudents = 0;

      // Check which exams cover this CO
      const examsCoveringCo = exams.filter((e) =>
        e.questions.some((q) => q.coMapping && q.coMapping.some((cm) => cm.co === coCode))
      );

      if (examsCoveringCo.length === 0) {
        coAttainments.push({
          co: coCode,
          description: coDef.description,
          bloomLevel: coDef.bloomLevel,
          totalStudents: totalStudentsCount,
          passingStudents: 0,
          attainmentPct: 0,
          attainmentLevel: 0,
        });
        continue;
      }

      // Check each student's combined score percentage for this CO
      for (const enrollment of enrollments) {
        const studentId = enrollment.student.toString();

        let weightedSumPct = 0;
        let sumWeights = 0;
        let directObtainedTotal = 0;
        let directPossibleTotal = 0;

        for (const exam of examsCoveringCo) {
          // Find student mark for this exam
          const sm = allMarks.find(
            (m) => m.exam.toString() === exam._id.toString() && m.student.toString() === studentId
          );

          // Sum marks obtained and possible in this exam for this CO
          let examObtained = 0;
          let examPossible = 0;

          const mappingQuestions = exam.questions.filter((q) =>
            q.coMapping && q.coMapping.some((cm) => cm.co === coCode)
          );

          for (const q of mappingQuestions) {
            const studentQMark = sm?.questionMarks.find((qm) => qm.question === q.number);
            const obtained = studentQMark ? studentQMark.marksObtained : 0;
            const coPercentage = q.coMapping.find((cm) => cm.co === coCode)?.percentage || 0;

            examObtained += obtained * (coPercentage / 100);
            examPossible += q.marks * (coPercentage / 100);
          }

          const examCoPct = examPossible > 0 ? (examObtained / examPossible) * 100 : 0;

          // Find weight from config
          const configWeightEntry = config.examWeights.find(
            (w) => w.examName.toLowerCase() === exam.name.toLowerCase()
          );

          if (configWeightEntry) {
            weightedSumPct += examCoPct * configWeightEntry.weight;
            sumWeights += configWeightEntry.weight;
          } else {
            directObtainedTotal += examObtained;
            directPossibleTotal += examPossible;
          }
        }

        let studentOfferingCoPct = 0;
        if (sumWeights > 0) {
          studentOfferingCoPct = weightedSumPct / sumWeights;
        } else if (directPossibleTotal > 0) {
          studentOfferingCoPct = (directObtainedTotal / directPossibleTotal) * 100;
        }

        if (studentOfferingCoPct >= config.studentPassThreshold) {
          passingStudents++;
        }
      }

      const attainmentPct = totalStudentsCount > 0 ? (passingStudents / totalStudentsCount) * 100 : 0;

      let attainmentLevel: 0 | 1 | 2 | 3 = 0;
      if (attainmentPct >= config.level3Threshold) {
        attainmentLevel = 3;
      } else if (attainmentPct >= config.level2Threshold) {
        attainmentLevel = 2;
      } else if (attainmentPct >= config.level1Threshold) {
        attainmentLevel = 1;
      }

      coAttainments.push({
        co: coCode,
        description: coDef.description,
        bloomLevel: coDef.bloomLevel,
        totalStudents: totalStudentsCount,
        passingStudents,
        attainmentPct,
        attainmentLevel,
      });
    }

    // 5. Compute PO Attainment
    const poAttainments = await this.computePOAttainmentFromCO(course, coAttainments);

    return {
      courseOffering: offering._id,
      coAttainments,
      poAttainments,
      config: {
        studentPassThreshold: config.studentPassThreshold,
        level3Threshold: config.level3Threshold,
        level2Threshold: config.level2Threshold,
        level1Threshold: config.level1Threshold,
      },
      computedAt: new Date(),
    };
  }

  /**
   * Helper to compute PO Attainment scores from Course CO-PO mappings and computed CO levels.
   * Enforces Weighted Average (Option A):
   * PO_j = Sum(CO_i_level * weight_ij) / Sum(weight_ij * 3) * 3
   */
  private async computePOAttainmentFromCO(course: any, coAttainments: ICOAttainment[]): Promise<IPOAttainment[]> {
    // Determine the source of Program Outcomes (Program if exists, else Department)
    let programOutcomes: any[] = [];
    if (course.program) {
      const prog = await ProgramModel.findById(course.program).lean();
      programOutcomes = prog ? prog.programOutcomes : [];
    } else {
      const dept = await DepartmentModel.findById(course.department).lean();
      programOutcomes = dept ? dept.programOutcomes : [];
    }

    if (programOutcomes.length === 0) return [];

    const coLevelMap = new Map<string, number>();
    coAttainments.forEach((ca) => {
      coLevelMap.set(ca.co, ca.attainmentLevel);
    });

    const poAttainments: IPOAttainment[] = [];

    for (const po of programOutcomes) {
      const mappings = course.coPoMapping.filter((m: any) => m.po === po.code);

      if (mappings.length === 0) {
        // Return 0 score if no CO maps to this PO
        poAttainments.push({
          po: po.code,
          description: po.description,
          attainmentScore: 0,
          contributingCOs: [],
        });
        continue;
      }

      let numerator = 0;
      let denominator = 0;
      const contributingCOs = [];

      for (const map of mappings) {
        const coLevel = coLevelMap.get(map.co) || 0;
        numerator += coLevel * map.weight;
        denominator += map.weight * 3;

        contributingCOs.push({
          co: map.co,
          weight: map.weight,
          attainmentLevel: coLevel,
        });
      }

      const attainmentScore = denominator > 0 ? (numerator / denominator) * 3 : 0;

      poAttainments.push({
        po: po.code,
        description: po.description,
        attainmentScore: Number(attainmentScore.toFixed(2)),
        contributingCOs,
      });
    }

    return poAttainments;
  }

  /**
   * Helper public wrapper to get PO attainment directly for an offering.
   */
  async computePOAttainment(offeringId: string): Promise<IPOAttainment[]> {
    const offeringAttainment = await this.computeOfferingAttainment(offeringId);
    return offeringAttainment.poAttainments;
  }

  /**
   * Compute aggregated PO attainment across all offerings for a specific Batch and Semester.
   */
  async computeBatchAttainment(batchId: string, semesterId: string) {
    const offerings = await CourseOfferingModel.find({
      batch: batchId,
      semester: semesterId,
      isDeleted: false,
    }).lean();

    if (offerings.length === 0) {
      return {
        batch: batchId,
        semester: semesterId,
        poAttainments: [],
        computedAt: new Date(),
      };
    }

    const allOfferingPos: IPOAttainment[][] = [];
    for (const offering of offerings) {
      try {
        const pos = await this.computePOAttainment(offering._id.toString());
        allOfferingPos.push(pos);
      } catch (err) {
        // Skip offerings that throw CONFIG_REQUIRED or other validation errors
        if (err instanceof AppError && err.code === 'CONFIG_REQUIRED') {
          continue;
        }
        throw err;
      }
    }

    if (allOfferingPos.length === 0) {
      return {
        batch: batchId,
        semester: semesterId,
        poAttainments: [],
        computedAt: new Date(),
      };
    }

    // Aggregate PO scores (average of scores across offerings)
    const poScoreSumMap = new Map<string, { sum: number; count: number; description: string }>();

    allOfferingPos.forEach((offeringPos) => {
      offeringPos.forEach((poAtt) => {
        const existing = poScoreSumMap.get(poAtt.po);
        if (existing) {
          existing.sum += poAtt.attainmentScore;
          existing.count += 1;
        } else {
          poScoreSumMap.set(poAtt.po, {
            sum: poAtt.attainmentScore,
            count: 1,
            description: poAtt.description,
          });
        }
      });
    });

    const aggregatedPos = Array.from(poScoreSumMap.entries()).map(([poCode, stats]) => ({
      po: poCode,
      description: stats.description,
      attainmentScore: Number((stats.sum / stats.count).toFixed(2)),
      offeringCount: stats.count,
    }));

    return {
      batch: batchId,
      semester: semesterId,
      poAttainments: aggregatedPos,
      computedAt: new Date(),
    };
  }

  /**
   * Compute department-level PO attainment for a Semester (aggregates all course offerings in the department).
   */
  async computeDepartmentAttainment(deptId: string, semesterId: string) {
    const offerings = await CourseOfferingModel.find({
      department: deptId,
      semester: semesterId,
      isDeleted: false,
    }).lean();

    if (offerings.length === 0) {
      return {
        department: deptId,
        semester: semesterId,
        poAttainments: [],
        computedAt: new Date(),
      };
    }

    const allOfferingPos: IPOAttainment[][] = [];
    for (const offering of offerings) {
      try {
        const pos = await this.computePOAttainment(offering._id.toString());
        allOfferingPos.push(pos);
      } catch (err) {
        if (err instanceof AppError && err.code === 'CONFIG_REQUIRED') {
          continue;
        }
        throw err;
      }
    }

    if (allOfferingPos.length === 0) {
      return {
        department: deptId,
        semester: semesterId,
        poAttainments: [],
        computedAt: new Date(),
      };
    }

    const poScoreSumMap = new Map<string, { sum: number; count: number; description: string }>();

    allOfferingPos.forEach((offeringPos) => {
      offeringPos.forEach((poAtt) => {
        const existing = poScoreSumMap.get(poAtt.po);
        if (existing) {
          existing.sum += poAtt.attainmentScore;
          existing.count += 1;
        } else {
          poScoreSumMap.set(poAtt.po, {
            sum: poAtt.attainmentScore,
            count: 1,
            description: poAtt.description,
          });
        }
      });
    });

    const aggregatedPos = Array.from(poScoreSumMap.entries()).map(([poCode, stats]) => ({
      po: poCode,
      description: stats.description,
      attainmentScore: Number((stats.sum / stats.count).toFixed(2)),
      offeringCount: stats.count,
    }));

    return {
      department: deptId,
      semester: semesterId,
      poAttainments: aggregatedPos,
      computedAt: new Date(),
    };
  }
}
