# offering/ — Course Offering Module

Manages the offering of a specific course in a semester for a particular batch/section, assigned to a teacher.

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST /` | `/api/offerings` | `admin+` | Create a course offering |
| `PUT /:id` | `/api/offerings/:id` | `admin+` | Update an offering |
| `GET /` | `/api/offerings` | `admin+` (scoped) | List offerings (filterable by semester, batch, teacher) |
| `GET /:id` | `/api/offerings/:id` | any authenticated | Get offering by ID |
| `DELETE /:id` | `/api/offerings/:id` | `superadmin` | Soft-delete an offering |

## Schema Fields

`course` (ref), `semester` (ref), `batch` (ref), `department` (ref), `section`, `teacher` (User ref), plus denormalized fields: `courseCode`, `courseTitle`, `semesterName`, `teacherName`, `teacherInitial`, `isActive`

## Key Behaviors

- Denormalized fields (`courseCode`, `courseTitle`, etc.) are stored for fast listing without populates.
- Unique constraint on `{ course, semester, batch, section }` prevents duplicate offerings.

## Connections

- **Links**: `Course` + `Semester` + `Batch` + `Department` + `User` (teacher).
- **Referenced by**: `Enrollment.courseOffering`, `Exam.courseOffering`.
- **Client page**: `dashboard/admin/offerings/page.tsx`.
