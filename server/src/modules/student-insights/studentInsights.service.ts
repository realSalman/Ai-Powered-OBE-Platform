import { ExamModel } from '../exam/exam.model';
import { CourseOfferingModel } from '../offering/offering.model';
import { CourseModel } from '../course/course.model';
import { StudentMarkModel } from '../marks/marks.model';
import { EnrollmentModel } from '../enrollment/enrollment.model';
import { AttainmentConfigModel } from '../attainment/attainment-config.model';
import { NotFoundError, ForbiddenError, ValidationError } from '../../core/errors';

// Bloom's Taxonomy ordered from lower to higher cognitive levels
const BLOOM_ORDER = ['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'];

// ────── Types ──────

interface IWeakQuestion {
  number: string;
  text: string;
  maxMarks: number;
  obtained: number;
  examName: string;
  lossPercentage: number;
}

interface ICOBreakdown {
  co: string;
  description: string;
  bloomLevel: string;
  percentage: number;
  obtained: number;
  possible: number;
  status: 'strong' | 'at-risk' | 'weak';
  weakQuestions: IWeakQuestion[];
}

interface IBloomBreakdown {
  level: string;
  percentage: number;
  totalObtained: number;
  totalPossible: number;
  status: 'strong' | 'at-risk' | 'weak';
}

export interface ICognitiveGapAnalysis {
  studentId: string;
  courseOfferingId: string;
  coBreakdown: ICOBreakdown[];
  bloomBreakdown: IBloomBreakdown[];
  diagnosis: string;
}

interface ICOProjection {
  co: string;
  description: string;
  bloomLevel: string;
  currentPercentage: number;
  completedExams: string[];
  upcomingExams: string[];
  requiredPercentage: number;
  status: 'safe' | 'achievable' | 'at-risk' | 'critical';
}

export interface IPathToPrediction {
  studentId: string;
  courseOfferingId: string;
  passThreshold: number;
  overallRisk: 'safe' | 'warning' | 'critical';
  coProjections: ICOProjection[];
  summary: string;
}

// ────── Service ──────

export class StudentInsightsService {

  /**
   * Shared helper: loads all the data needed for insights computations.
   */
  private async loadContext(studentId: string, courseOfferingId: string) {
    // 1. Verify offering exists
    const offering = await CourseOfferingModel.findOne({ _id: courseOfferingId, isDeleted: false }).lean();
    if (!offering) throw new NotFoundError('CourseOffering', courseOfferingId);

    // 2. Verify student is enrolled
    const enrollment = await EnrollmentModel.findOne({
      student: studentId,
      courseOffering: courseOfferingId,
      status: 'active',
      isDeleted: false,
    }).lean();
    if (!enrollment) {
      throw new ForbiddenError('You are not enrolled in this course offering');
    }

    // 3. Load course with COs
    const course = await CourseModel.findById(offering.course).lean();
    if (!course) throw new NotFoundError('Course', offering.course.toString());

    // 4. Load all exams for the offering
    const exams = await ExamModel.find({ courseOffering: courseOfferingId, isDeleted: false }).lean();

    // 5. Load student's marks across all exams in this offering
    const examIds = exams.map(e => e._id);
    const studentMarks = await StudentMarkModel.find({
      exam: { $in: examIds },
      student: studentId,
      isDeleted: false,
    }).lean();

    // 6. Load attainment config for thresholds
    const config = await AttainmentConfigModel.findOne({
      department: offering.department,
      isConfigured: true,
      isDeleted: false,
    }).lean();

    const passThreshold = config?.studentPassThreshold ?? 50;
    const examWeights = config?.examWeights ?? [];

    return { offering, course, exams, studentMarks, passThreshold, examWeights };
  }

  /**
   * Feature 1: Cognitive Gap Analyzer
   */
  async analyzeGaps(studentId: string, courseOfferingId: string): Promise<ICognitiveGapAnalysis> {
    const { course, exams, studentMarks, passThreshold } = await this.loadContext(studentId, courseOfferingId);

    const outcomes = course.courseOutcomes || [];
    if (outcomes.length === 0) {
      return {
        studentId,
        courseOfferingId,
        coBreakdown: [],
        bloomBreakdown: [],
        diagnosis: 'No course outcomes defined for this course.',
      };
    }

    // Build a marks lookup: examId -> { questionNumber -> marksObtained }
    const marksLookup = new Map<string, Map<string, number>>();
    studentMarks.forEach(sm => {
      const qMap = new Map<string, number>();
      sm.questionMarks.forEach(qm => qMap.set(qm.question, qm.marksObtained));
      marksLookup.set(sm.exam.toString(), qMap);
    });

    // ── CO Breakdown ──
    const coBreakdown: ICOBreakdown[] = [];

    // Bloom-level accumulators
    const bloomAccum: Record<string, { obtained: number; possible: number }> = {};
    BLOOM_ORDER.forEach(level => { bloomAccum[level] = { obtained: 0, possible: 0 }; });

    for (const coDef of outcomes) {
      const coCode = coDef.code;
      let totalObtained = 0;
      let totalPossible = 0;
      const weakQuestions: IWeakQuestion[] = [];

      for (const exam of exams) {
        const qMarks = marksLookup.get(exam._id.toString());
        // Only analyze exams the student has taken
        if (!qMarks) continue;

        for (const q of exam.questions) {
          if (!q.coMapping) continue;
          const coMapping = q.coMapping.find(cm => cm.co === coCode);
          if (!coMapping) continue;

          const fraction = coMapping.percentage / 100;
          const possibleForCo = q.marks * fraction;
          const obtainedRaw = qMarks.get(q.number) ?? 0;
          const obtainedForCo = obtainedRaw * fraction;

          totalObtained += obtainedForCo;
          totalPossible += possibleForCo;

          // Track weak questions: lost > 50% of available marks on this question
          const lossPercentage = possibleForCo > 0 ? ((possibleForCo - obtainedForCo) / possibleForCo) * 100 : 0;
          if (lossPercentage > 50 && possibleForCo > 0) {
            weakQuestions.push({
              number: q.number,
              text: q.text || '',
              maxMarks: q.marks,
              obtained: obtainedRaw,
              examName: exam.name,
              lossPercentage: Number(lossPercentage.toFixed(1)),
            });
          }
        }
      }

      const percentage = totalPossible > 0 ? (totalObtained / totalPossible) * 100 : 0;
      const status = percentage >= passThreshold ? 'strong' : percentage >= passThreshold * 0.7 ? 'at-risk' : 'weak';

      coBreakdown.push({
        co: coCode,
        description: coDef.description,
        bloomLevel: coDef.bloomLevel,
        percentage: Number(percentage.toFixed(1)),
        obtained: Number(totalObtained.toFixed(2)),
        possible: Number(totalPossible.toFixed(2)),
        status,
        weakQuestions: weakQuestions.sort((a, b) => b.lossPercentage - a.lossPercentage),
      });

      // Accumulate into bloom breakdown
      const bl = coDef.bloomLevel;
      if (bloomAccum[bl]) {
        bloomAccum[bl].obtained += totalObtained;
        bloomAccum[bl].possible += totalPossible;
      }
    }

    // ── Bloom Breakdown ──
    const bloomBreakdown: IBloomBreakdown[] = BLOOM_ORDER
      .map(level => {
        const acc = bloomAccum[level];
        const percentage = acc.possible > 0 ? (acc.obtained / acc.possible) * 100 : -1; // -1 = no data
        const status: 'strong' | 'at-risk' | 'weak' =
          percentage < 0 ? 'strong' : // no data, don't show as weak
          percentage >= passThreshold ? 'strong' :
          percentage >= passThreshold * 0.7 ? 'at-risk' : 'weak';
        return {
          level,
          percentage: percentage < 0 ? 0 : Number(percentage.toFixed(1)),
          totalObtained: Number(acc.obtained.toFixed(2)),
          totalPossible: Number(acc.possible.toFixed(2)),
          status: acc.possible === 0 ? 'strong' as const : status,
        };
      })
      .filter(b => b.totalPossible > 0); // Only show Bloom levels that have data

    // ── Diagnosis ──
    const diagnosis = this.generateDiagnosis(bloomBreakdown, coBreakdown, passThreshold);

    return {
      studentId,
      courseOfferingId,
      coBreakdown,
      bloomBreakdown,
      diagnosis,
    };
  }

  /**
   * Generates a plain-English diagnosis from Bloom and CO data.
   */
  private generateDiagnosis(
    bloom: IBloomBreakdown[],
    cos: ICOBreakdown[],
    passThreshold: number
  ): string {
    if (bloom.length === 0) return 'No exam data available yet for analysis.';

    const lowerLevels = bloom.filter(b => ['Remember', 'Understand'].includes(b.level) && b.totalPossible > 0);
    const higherLevels = bloom.filter(b => ['Apply', 'Analyze', 'Evaluate', 'Create'].includes(b.level) && b.totalPossible > 0);

    const lowerAvg = lowerLevels.length > 0
      ? lowerLevels.reduce((s, b) => s + b.percentage, 0) / lowerLevels.length
      : -1;
    const higherAvg = higherLevels.length > 0
      ? higherLevels.reduce((s, b) => s + b.percentage, 0) / higherLevels.length
      : -1;

    const weakCOs = cos.filter(c => c.status === 'weak');
    const atRiskCOs = cos.filter(c => c.status === 'at-risk');

    const parts: string[] = [];

    // Pattern 1: Theory OK, application weak
    if (lowerAvg >= 0 && higherAvg >= 0 && lowerAvg >= passThreshold && higherAvg < passThreshold) {
      parts.push(
        `You understand the theory well (${lowerAvg.toFixed(0)}% on Remember/Understand questions), ` +
        `but struggle with application (${higherAvg.toFixed(0)}% on Apply/Analyze/Evaluate questions). ` +
        `Focus on solving practice problems rather than re-reading notes.`
      );
    }
    // Pattern 2: Everything weak
    else if (lowerAvg >= 0 && lowerAvg < passThreshold && (higherAvg < 0 || higherAvg < passThreshold)) {
      parts.push(
        `Foundational gaps detected — you're scoring ${lowerAvg.toFixed(0)}% on basic recall questions. ` +
        `Review core concepts and definitions before attempting application-level practice.`
      );
    }
    // Pattern 3: Lower weak, higher strong (rare)
    else if (lowerAvg >= 0 && higherAvg >= 0 && lowerAvg < passThreshold && higherAvg >= passThreshold) {
      parts.push(
        `Interesting pattern: you reason well at higher levels (${higherAvg.toFixed(0)}%) ` +
        `but miss basic factual recall (${lowerAvg.toFixed(0)}%). Review definitions, formulas, and key terminologies.`
      );
    }
    // Pattern 4: Everything good
    else if (lowerAvg >= passThreshold && (higherAvg < 0 || higherAvg >= passThreshold)) {
      parts.push(`Strong overall performance across all cognitive levels. Keep maintaining this standard.`);
    }

    // Add CO-specific callouts
    if (weakCOs.length > 0) {
      const coList = weakCOs.map(c => `${c.co} (${c.bloomLevel})`).join(', ');
      parts.push(`Priority areas: ${coList}.`);
    } else if (atRiskCOs.length > 0) {
      const coList = atRiskCOs.map(c => `${c.co} (${c.bloomLevel})`).join(', ');
      parts.push(`Watch out for: ${coList} — they're close to the threshold.`);
    }

    return parts.join(' ') || 'Insufficient data for a complete diagnosis. More exam results are needed.';
  }

  /**
   * Feature 2: Early Warning & Path to Pass Predictor
   */
  async predictPath(studentId: string, courseOfferingId: string): Promise<IPathToPrediction> {
    const { course, exams, studentMarks, passThreshold, examWeights } = await this.loadContext(studentId, courseOfferingId);

    const outcomes = course.courseOutcomes || [];
    if (outcomes.length === 0 || exams.length === 0) {
      return {
        studentId,
        courseOfferingId,
        passThreshold,
        overallRisk: 'safe',
        coProjections: [],
        summary: 'No exams or course outcomes defined yet.',
      };
    }

    // Which exams has the student completed?
    const completedExamIds = new Set(studentMarks.map(sm => sm.exam.toString()));

    // Build marks lookup
    const marksLookup = new Map<string, Map<string, number>>();
    studentMarks.forEach(sm => {
      const qMap = new Map<string, number>();
      sm.questionMarks.forEach(qm => qMap.set(qm.question, qm.marksObtained));
      marksLookup.set(sm.exam.toString(), qMap);
    });

    // Build exam weight lookup (fallback to equal weight = 1)
    const getExamWeight = (examName: string): number => {
      if (examWeights.length === 0) return 1; // equal weighting fallback
      const entry = examWeights.find(w => w.examName.toLowerCase() === examName.toLowerCase());
      return entry ? entry.weight : 1;
    };

    const coProjections: ICOProjection[] = [];

    for (const coDef of outcomes) {
      const coCode = coDef.code;

      let weightedScoreSum = 0;
      let completedWeightSum = 0;
      let upcomingWeightSum = 0;
      const completedExamNames: string[] = [];
      const upcomingExamNames: string[] = [];

      for (const exam of exams) {
        // Check if this exam covers this CO
        const mappingQuestions = exam.questions.filter(q =>
          q.coMapping && q.coMapping.some(cm => cm.co === coCode)
        );
        if (mappingQuestions.length === 0) continue;

        const weight = getExamWeight(exam.name);
        const isCompleted = completedExamIds.has(exam._id.toString());

        if (isCompleted) {
          const qMarks = marksLookup.get(exam._id.toString());
          let examObtained = 0;
          let examPossible = 0;

          for (const q of mappingQuestions) {
            const coPercentage = q.coMapping.find(cm => cm.co === coCode)?.percentage || 0;
            const obtained = qMarks?.get(q.number) ?? 0;
            examObtained += obtained * (coPercentage / 100);
            examPossible += q.marks * (coPercentage / 100);
          }

          const examCoPct = examPossible > 0 ? (examObtained / examPossible) * 100 : 0;
          weightedScoreSum += examCoPct * weight;
          completedWeightSum += weight;
          completedExamNames.push(exam.name);
        } else {
          upcomingWeightSum += weight;
          upcomingExamNames.push(exam.name);
        }
      }

      // Skip COs not covered by any exam
      if (completedWeightSum === 0 && upcomingWeightSum === 0) continue;

      const totalWeight = completedWeightSum + upcomingWeightSum;
      const currentPercentage = completedWeightSum > 0 ? weightedScoreSum / completedWeightSum : 0;

      let requiredPercentage: number;
      let status: 'safe' | 'achievable' | 'at-risk' | 'critical';

      if (upcomingWeightSum === 0) {
        // All exams completed — just check if passing
        requiredPercentage = 0;
        status = currentPercentage >= passThreshold ? 'safe' : 'critical';
      } else {
        // Calculate: what % needed on remaining exams?
        // passThreshold * totalWeight <= weightedScoreSum + requiredPct * upcomingWeight
        // requiredPct = (passThreshold * totalWeight - weightedScoreSum) / upcomingWeight
        requiredPercentage = (passThreshold * totalWeight - weightedScoreSum) / upcomingWeightSum;

        if (requiredPercentage <= 0) {
          requiredPercentage = 0;
          status = 'safe';
        } else if (requiredPercentage <= 60) {
          status = 'achievable';
        } else if (requiredPercentage <= 85) {
          status = 'at-risk';
        } else if (requiredPercentage <= 100) {
          status = 'critical';
        } else {
          // > 100% required = mathematically impossible
          requiredPercentage = Math.min(requiredPercentage, 100);
          status = 'critical';
        }
      }

      coProjections.push({
        co: coCode,
        description: coDef.description,
        bloomLevel: coDef.bloomLevel,
        currentPercentage: Number(currentPercentage.toFixed(1)),
        completedExams: completedExamNames,
        upcomingExams: upcomingExamNames,
        requiredPercentage: Number(Math.max(0, requiredPercentage).toFixed(1)),
        status,
      });
    }

    // ── Overall Risk ──
    const criticalCount = coProjections.filter(c => c.status === 'critical').length;
    const atRiskCount = coProjections.filter(c => c.status === 'at-risk').length;

    let overallRisk: 'safe' | 'warning' | 'critical';
    if (criticalCount > 0) overallRisk = 'critical';
    else if (atRiskCount > 0) overallRisk = 'warning';
    else overallRisk = 'safe';

    // ── Summary ──
    const summary = this.generatePredictionSummary(coProjections, passThreshold, overallRisk);

    return {
      studentId,
      courseOfferingId,
      passThreshold,
      overallRisk,
      coProjections,
      summary,
    };
  }

  /**
   * Generates a plain-English prediction summary.
   */
  private generatePredictionSummary(
    projections: ICOProjection[],
    passThreshold: number,
    overallRisk: 'safe' | 'warning' | 'critical'
  ): string {
    if (projections.length === 0) return 'No CO projections available.';

    const critical = projections.filter(p => p.status === 'critical');
    const atRisk = projections.filter(p => p.status === 'at-risk');
    const hasUpcoming = projections.some(p => p.upcomingExams.length > 0);

    if (!hasUpcoming) {
      if (overallRisk === 'safe') return 'All exams completed. You are passing all Course Outcomes.';
      const failedCOs = projections.filter(p => p.currentPercentage < passThreshold);
      return `All exams completed. You are below the ${passThreshold}% threshold in ${failedCOs.map(c => c.co).join(', ')}.`;
    }

    const parts: string[] = [];

    if (overallRisk === 'safe') {
      parts.push('You are on track to pass all Course Outcomes.');
    } else if (overallRisk === 'critical') {
      parts.push(`You are at high risk in ${critical.length} CO${critical.length > 1 ? 's' : ''}.`);
    } else {
      parts.push(`You need attention in ${atRisk.length + critical.length} CO${(atRisk.length + critical.length) > 1 ? 's' : ''}.`);
    }

    // Add specific actionable callouts for the most urgent COs
    const urgent = [...critical, ...atRisk].slice(0, 3); // Top 3
    urgent.forEach(p => {
      const examList = p.upcomingExams.join(', ');
      if (p.status === 'critical') {
        parts.push(`To pass ${p.co}, you need at least ${p.requiredPercentage}% on ${examList} — this will be very challenging.`);
      } else {
        parts.push(`For ${p.co}, aim for ${p.requiredPercentage}% on ${examList}.`);
      }
    });

    return parts.join(' ');
  }
}
