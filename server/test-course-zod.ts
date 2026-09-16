import { z } from 'zod';

const bloomLevel = z.enum(['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create']);

const courseOutcomeSchema = z.object({
  code: z.string().regex(/^CO\d+$/, 'Must be format CO1, CO2...'),
  description: z.string().min(10).max(500),
  bloomLevel,
});

const coPoMappingSchema = z.object({
  co: z.string().regex(/^CO\d+$/),
  po: z.string().regex(/^(PO|PSO)\d+$/),
  weight: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

const examTemplateSchema = z.object({
  name: z.string().min(2).max(100),
  weightPercent: z.number().min(0).max(100),
  cosCovered: z.array(z.string().regex(/^CO\d+$/)).min(1),
});

const baseCourseSchema = z.object({
  code: z.string().min(3).max(20).toUpperCase().trim(),
  title: z.string().min(3).max(200).trim(),
  credits: z.number().min(0).max(10),
  type: z.enum(['theory', 'lab', 'project']),
  department: z.string().length(24),
  program: z.union([z.string().length(24), z.literal('')]).transform(v => v === '' ? null : v).nullable().optional(),
  courseOutcomes: z.array(courseOutcomeSchema).min(1).max(20),
  coPoMapping: z.array(coPoMappingSchema).default([]),
  examTemplates: z.array(examTemplateSchema).default([]),
});

const updateCourseSchema = baseCourseSchema.partial().refine(
  (data) => {
    if (!data.examTemplates || data.examTemplates.length === 0) return true;
    return data.examTemplates.reduce((sum, t) => sum + t.weightPercent, 0) === 100;
  },
  { message: 'Exam template weights must sum to 100%', path: ['examTemplates'] }
).refine(
  (data) => {
    if (!data.courseOutcomes || !data.coPoMapping) return true;
    const coCodes = new Set(data.courseOutcomes.map(co => co.code));
    return data.coPoMapping.every(m => coCodes.has(m.co));
  },
  { message: 'coPoMapping references non-existent CO', path: ['coPoMapping'] }
).refine(
  (data) => {
    if (!data.courseOutcomes || !data.examTemplates) return true;
    const coCodes = new Set(data.courseOutcomes.map(co => co.code));
    return data.examTemplates.every(t => t.cosCovered.every(co => coCodes.has(co)));
  },
  { message: 'examTemplates references non-existent CO', path: ['examTemplates'] }
);

const payload = {
  code: "CSE101L",
  title: "Introduction to Programming Lab",
  credits: 1,
  type: "lab",
  department: "60b8d295f1d293001f85d123", // some dummy id
  program: "",
  courseOutcomes: [
    { code: "CO1", bloomLevel: "Create", description: "Develop code for basic algorithms in C++" },
    { code: "CO2", bloomLevel: "Apply", description: "Debug and test syntax and logical errors" }
  ],
  coPoMapping: [],
  examTemplates: []
};

const result = updateCourseSchema.safeParse(payload);
if (!result.success) {
  console.dir(result.error.format(), { depth: null });
} else {
  console.log("Success!");
}
