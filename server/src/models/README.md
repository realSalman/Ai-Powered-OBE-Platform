# models/ — Shared Mongoose Models

Domain models that are used across multiple modules or routes.

## Files

| File | Model | Purpose |
|------|-------|---------|
| `User.ts` | `User` | Central user model. Stores email, name, roles (enum: `student`, `HOD`, `faculty`, `supervisor`, `admin`, `superadmin`), department reference, and role-specific fields (`studentId`, `batch`, `teacherInitial`). |

## User Roles

| Role | Purpose |
|------|---------|
| `student` | Enrolled learner. Requires `studentId`. |
| `faculty` | Teacher/instructor. Requires `teacherInitial`. |
| `HOD` | Department head. Has department-scoped admin access. |
| `supervisor` | Oversees section allocation within batches. |
| `admin` | Department-scoped administrator. |
| `superadmin` | Full system access across all departments. |

## Indexes

- `studentId` — sparse unique (only students have it)
- `teacherInitial` — sparse unique (only faculty have it)
- `{ department, roles }` — for scoped user queries
- `{ department, batch }` — for batch-level queries

## Connection to Other Modules

- Referenced by `authMiddleware.ts` for user lookup during token verification.
- Referenced by `adminRoutes.ts` for user creation and listing.
- Referenced as `ObjectId` foreign keys in `CourseOffering.teacher`, `Enrollment.student`, `SectionAssignment.student`, and audit fields (`createdBy`, `updatedBy`, `deletedBy`).
