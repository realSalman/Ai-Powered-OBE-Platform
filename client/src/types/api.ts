export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
}

export interface IProgramOutcome {
  code: string;
  description: string;
}

export interface IDepartment {
  _id: string;
  code: string;
  name: string;
  hasPrograms: boolean;
  programOutcomes: IProgramOutcome[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IProgram {
  _id: string;
  code: string;
  name: string;
  department: string | IDepartment; // Can be populated
  programOutcomes: IProgramOutcome[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type SemesterStatus = 'upcoming' | 'active' | 'completed';

export interface ISemester {
  _id: string;
  name: string;
  department: string | IDepartment; // Can be populated
  startDate: string;
  endDate: string;
  status: SemesterStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IBatch {
  _id: string;
  name: string;
  code: string;
  department: string | IDepartment; // Can be populated
  program: string | IProgram | null; // Can be populated
  sections: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type BloomLevel = 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create';

export interface ICourseOutcome {
  code: string;
  description: string;
  bloomLevel: BloomLevel;
}

export interface ICoPoMapping {
  co: string;
  po: string;
  weight: 1 | 2 | 3;
}

export interface IExamTemplate {
  name: string;
  totalMarks: number;
  cosCovered: string[];
}

export interface ICourse {
  _id: string;
  code: string;
  title: string;
  credits: number;
  type: 'theory' | 'lab' | 'project';
  department: string | IDepartment; // Can be populated
  program: string | IProgram | null; // Can be populated
  courseOutcomes: ICourseOutcome[];
  coPoMapping: ICoPoMapping[];
  examTemplates: IExamTemplate[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ICourseOffering {
  _id: string;
  course: string | ICourse; // Can be populated
  semester: string | ISemester; // Can be populated
  batch: string | IBatch; // Can be populated
  section: string;
  teacher: string | any | null; // User reference
  courseCode: string;
  courseTitle: string;
  semesterName: string;
  teacherName: string | null;
  teacherInitial: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ISectionAssignment {
  _id: string;
  student: string | any; // User reference
  semester: string | ISemester; // Can be populated
  batch: string | IBatch; // Can be populated
  section: string;
  createdAt: string;
  updatedAt: string;
}

export interface IEnrollment {
  _id: string;
  student: string | any; // User reference or populated
  courseOffering: string | ICourseOffering; // Can be populated
  isElective: boolean;
  status: 'active' | 'dropped';
  createdAt: string;
  updatedAt: string;
}

export interface ICoMapping {
  co: string;
  percentage: number;
}

export interface IQuestion {
  number: string;
  text?: string;
  marks: number;
  coMapping: ICoMapping[];
}

export interface IExam {
  _id: string;
  name: string;
  totalMarks: number;
  cosCovered: string[];
  courseOffering: string | ICourseOffering; // Can be populated
  questions: IQuestion[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IQuestionMark {
  question: string;
  marksObtained: number;
}

export interface IStudentMark {
  _id: string;
  exam: string | IExam;
  student: string | IUser;
  courseOffering: string | ICourseOffering;
  questionMarks: IQuestionMark[];
  totalObtained: number;
  submittedBy: string | IUser;
  submittedAt: string;
}

export interface IExamWeightEntry {
  examName: string;
  weight: number;
}

export interface IAttainmentConfig {
  _id: string;
  department: string | IDepartment;
  studentPassThreshold: number;
  level3Threshold: number;
  level2Threshold: number;
  level1Threshold: number;
  examWeights: IExamWeightEntry[];
  isConfigured: boolean;
}

export interface ICOAttainment {
  co: string;
  description: string;
  bloomLevel: string;
  totalStudents: number;
  passingStudents: number;
  attainmentPct: number;
  attainmentLevel: 0 | 1 | 2 | 3;
}

export interface IPOAttainment {
  po: string;
  description: string;
  attainmentScore: number;
  contributingCOs: {
    co: string;
    weight: number;
    attainmentLevel: number;
  }[];
}

export interface IOfferingAttainment {
  courseOffering: string | ICourseOffering;
  coAttainments: ICOAttainment[];
  poAttainments: IPOAttainment[];
  config: {
    studentPassThreshold: number;
    level3Threshold: number;
    level2Threshold: number;
    level1Threshold: number;
  };
  computedAt: string;
}

export interface IExamAttainment {
  exam: string | IExam;
  coAttainments: ICOAttainment[];
  computedAt: string;
}


// User interface from AuthContext for references
export interface IUser {
  _id: string;
  email: string;
  name: string;
  roles: string[];
  department?: string | IDepartment;
  studentId?: string;
  batch?: string;
  teacherInitial?: string;
}

// AI Types
export interface IAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

export interface IAIChat {
  _id: string;
  user: string;
  title: string;
  aiModel: string;
  role: string;
  messages: IAIMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface IAIKeyStatus {
  hasKey: boolean;
  isValid: boolean;
  preferredModel: string;
  lastValidated?: string;
}

// Student Insights Types
export interface IWeakQuestion {
  number: string;
  text: string;
  maxMarks: number;
  obtained: number;
  examName: string;
  lossPercentage: number;
}

export interface ICOBreakdown {
  co: string;
  description: string;
  bloomLevel: string;
  percentage: number;
  obtained: number;
  possible: number;
  status: 'strong' | 'at-risk' | 'weak';
  weakQuestions: IWeakQuestion[];
}

export interface IBloomBreakdown {
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

export interface ICOProjection {
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

