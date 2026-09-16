import { Types } from 'mongoose';

export interface IStudentCOScore {
  student: Types.ObjectId;
  co: string;
  marksObtained: number;   // sum of split marks across questions
  marksPossible: number;   // sum of split possible across questions
  percentage: number;
  passed: boolean;         // percentage >= studentPassThreshold
}

export interface ICOAttainment {
  co: string;
  description: string;
  bloomLevel: string;
  totalStudents: number;
  passingStudents: number;
  attainmentPct: number;       // passingStudents / totalStudents * 100
  attainmentLevel: 0 | 1 | 2 | 3;
}

export interface IPOAttainment {
  po: string;
  description: string;
  attainmentScore: number;     // 0-3 scale, weighted average (Option A)
  contributingCOs: {
    co: string;
    weight: number;            // from Course.coPoMapping
    attainmentLevel: number;
  }[];
}

export interface IOfferingAttainment {
  courseOffering: Types.ObjectId;
  coAttainments: ICOAttainment[];
  poAttainments: IPOAttainment[];
  config: {                    // snapshot of thresholds used
    studentPassThreshold: number;
    level3Threshold: number;
    level2Threshold: number;
    level1Threshold: number;
  };
  computedAt: Date;
}

export interface IExamAttainment {
  exam: Types.ObjectId;
  coAttainments: ICOAttainment[];
  computedAt: Date;
}
