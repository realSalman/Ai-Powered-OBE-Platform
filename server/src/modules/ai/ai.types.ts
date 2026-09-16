import { Types, Document } from 'mongoose';

// ─── Message & Chat ─────────────────────────────────────────────────────────

export interface IMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

export interface IAIChat extends Document {
  user: Types.ObjectId;
  title: string;
  aiModel: string;
  role: string;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── API Key Vault ──────────────────────────────────────────────────────────

export interface IAIKey extends Document {
  user: Types.ObjectId;
  encryptedKey: string;
  iv: string;
  authTag: string;
  provider: string;
  isValid: boolean;
  lastValidated?: Date;
  preferredModel: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Analysis Request ───────────────────────────────────────────────────────

export type AnalysisType = 'root-cause' | 'at-risk' | 'improvement' | 'career-advisory' | 'performance';

export type ScopeType = 'offering' | 'batch' | 'department' | 'student';

export interface AIAnalysisRequest {
  type: AnalysisType;
  scopeId: string;
  scopeType: ScopeType;
}

// ─── Chat Request ───────────────────────────────────────────────────────────

export interface AIChatRequest {
  chatId?: string;
  message: string;
  model?: string;
}

// ─── Tool Definition (OpenRouter function-calling schema) ───────────────────

export interface AIToolParameter {
  type: string;
  description: string;
  enum?: string[];
}

export interface AIToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, AIToolParameter>;
      required: string[];
    };
  };
}

// ─── Role → Tool Mapping ────────────────────────────────────────────────────

export const ROLE_TOOL_MAP: Record<string, string[]> = {
  student: [
    'get_student_marks',
    'get_student_enrollments',
  ],
  faculty: [
    'get_student_marks',
    'get_exam_summary',
    'get_offering_attainment',
    'get_exam_attainment',
    'get_student_enrollments',
    'get_at_risk_students',
    'get_class_mark_distribution',
  ],
  HOD: [
    'get_student_marks',
    'get_exam_summary',
    'get_offering_attainment',
    'get_exam_attainment',
    'get_batch_attainment',
    'get_department_attainment',
    'get_student_enrollments',
    'get_at_risk_students',
    'get_class_mark_distribution',
  ],
  supervisor: [
    'get_student_marks',
    'get_exam_summary',
    'get_offering_attainment',
    'get_exam_attainment',
    'get_batch_attainment',
    'get_department_attainment',
    'get_student_enrollments',
    'get_at_risk_students',
    'get_class_mark_distribution',
  ],
  admin: [
    'get_student_marks',
    'get_exam_summary',
    'get_offering_attainment',
    'get_exam_attainment',
    'get_batch_attainment',
    'get_department_attainment',
    'get_student_enrollments',
    'get_at_risk_students',
    'get_class_mark_distribution',
  ],
  superadmin: [
    'get_student_marks',
    'get_exam_summary',
    'get_offering_attainment',
    'get_exam_attainment',
    'get_batch_attainment',
    'get_department_attainment',
    'get_student_enrollments',
    'get_at_risk_students',
    'get_class_mark_distribution',
  ],
};

// ─── Anonymization Context ──────────────────────────────────────────────────

export interface AnonymizationContext {
  forwardNameMap: Map<string, string>;
  reverseNameMap: Map<string, string>;
  forwardIdMap: Map<string, string>;
  reverseIdMap: Map<string, string>;
}
