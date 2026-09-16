# enrollment/ — Enrollment Module

Manages student enrollment in specific course offerings. Tracks active/dropped status and elective flag.

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST /` | `/api/enrollments` | `admin+` | Create enrollment |
| `PUT /:id` | `/api/enrollments/:id` | `admin+` | Update enrollment |
| `GET /` | `/api/enrollments` | `admin+` (scoped) | List enrollments |
| `GET /:id` | `/api/enrollments/:id` | any authenticated | Get enrollment by ID |
| `DELETE /:id` | `/api/enrollments/:id` | `superadmin` | Soft-delete enrollment |

## Schema Fields

`student` (User ref), `courseOffering` (ref), `isElective` (boolean), `status` (`active`/`dropped`)

## Key Constraints

- Unique index on `{ student, courseOffering }` — a student can only enroll once per offering.

## Connections

- **Links**: `User` (student) + `CourseOffering`.
- **Client pages**: `dashboard/admin/enrollments/page.tsx` (admin management), `dashboard/student/page.tsx` (student views their enrollments via `GET /enrollments/me`).
