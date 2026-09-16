# types/ — TypeScript Type Definitions

Client-side TypeScript interfaces that mirror the server's data shapes.

## Files

| File | Purpose |
|------|---------|
| `api.ts` | Defines all shared types: `ApiResponse<T>`, `PaginationMeta`, and interfaces for every domain entity — `IDepartment`, `IProgram`, `ISemester`, `IBatch`, `ICourse` (with `ICourseOutcome`, `ICoPoMapping`, `IExamTemplate`), `ICourseOffering`, `ISectionAssignment`, `IEnrollment`, `IExam` (with `IQuestion`), `IUser`. Also exports enum-like types: `SemesterStatus`, `BloomLevel`. |

## Key Design Decisions

- Entity interfaces use **union types** for foreign keys: `department: string | IDepartment`. This handles both the raw ObjectId (non-populated) and the full object (populated by Mongoose `.populate()`).
- These types mirror the server's `modules/*/types.ts` + `core/types/response.ts` but are adapted for client consumption (e.g., dates as `string` instead of `Date`).

## Connections

- **Used by**: Every page component (for typing API responses), `lib/api.ts` (for `ApiResponse<T>`), `hooks/useDepartmentName.ts` (for `IDepartment`).
- **Mirrors**: Server-side types in `server/src/modules/*/types.ts` and `server/src/core/types/response.ts`.
