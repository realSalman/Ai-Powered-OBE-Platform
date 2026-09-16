# modules/ — Feature Modules

Each subdirectory is a self-contained feature module following a consistent 6-file pattern.

## Module Pattern

Every module contains:

| File | Role |
|------|------|
| `*.model.ts` | Mongoose schema + model. Applies `auditPlugin` + `softDeletePlugin`. Defines indexes. |
| `*.types.ts` | TypeScript interfaces for the document (extends `ISoftDeleteSchema`). |
| `*.validator.ts` | Zod schemas for create, update, and list-query validation. |
| `*.service.ts` | Business logic — CRUD operations, cache read-through (`cacheAside`), cache invalidation, conflict/not-found checks. Uses `QueryBuilder` for list operations. |
| `*.controller.ts` | Thin layer — instantiates the service, calls the appropriate method, and returns via `sendSuccess()`. |
| `*.routes.ts` | Express Router — chains auth guards, validation, and controller via `asyncHandler`. |

## Modules

| Module | API Path | Purpose | Key Relationships |
|--------|----------|---------|-------------------|
| `department/` | `/api/departments` | Academic departments (e.g., CSE, EEE). Superadmin-only creation. | Root entity. Referenced by programs, semesters, batches, courses, offerings, section assignments. |
| `program/` | `/api/programs` | Degree programs within a department (e.g., B.Sc. CSE). | Belongs to `Department`. Referenced by batches and courses. |
| `semester/` | `/api/semesters` | Academic terms with start/end dates and status (`upcoming`/`active`/`completed`). | Belongs to `Department`. Referenced by offerings, enrollments, section assignments. |
| `batch/` | `/api/batches` | Student batches (e.g., "Batch 60") with section lists. | Belongs to `Department` + optional `Program`. Referenced by offerings and section assignments. |
| `course/` | `/api/courses` | Courses with outcomes (COs), CO→PO mappings, and exam templates. | Belongs to `Department` + optional `Program`. Referenced by offerings. |
| `offering/` | `/api/offerings` | A specific course offered in a semester for a batch/section, assigned to a teacher. | Links `Course` + `Semester` + `Batch` + `User(teacher)`. Referenced by enrollments and exams. |
| `section-assignment/` | `/api/section-assignments` | Assigns a student to a section within a semester/batch. | Links `User(student)` + `Semester` + `Batch` + `Department`. |
| `enrollment/` | `/api/enrollments` | Student enrollment in a specific course offering. | Links `User(student)` + `CourseOffering`. |
| `exam/` | `/api/exams` | Exam definitions with questions, marks, and CO mapping. | Belongs to `CourseOffering`. |

## Route Registration

`index.ts` in this folder exports `registerRoutes(app)` which mounts all module routers plus the legacy `authRoutes` and `adminRoutes`:

```
/api/auth              → authRoutes
/api/admin             → adminRoutes
/api/departments       → departmentRoutes
/api/programs          → programRoutes
/api/semesters         → semesterRoutes
/api/batches           → batchRoutes
/api/courses           → courseRoutes
/api/section-assignments → sectionAssignmentRoutes
/api/offerings         → offeringRoutes
/api/enrollments       → enrollmentRoutes
/api/exams             → examRoutes
```

## Entity Relationship Diagram

```
Department
  ├── Program
  ├── Semester
  ├── Batch (→ Program?)
  ├── Course (→ Program?)
  └── CourseOffering (→ Course + Semester + Batch + User:teacher)
       ├── Enrollment (→ User:student)
       └── Exam
  └── SectionAssignment (→ User:student + Semester + Batch)
```
