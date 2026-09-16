# app/ — Next.js App Router Pages

Defines all routes and page layouts using Next.js 15 App Router conventions.

## Files

| File | Route | Purpose |
|------|-------|---------|
| `layout.tsx` | Root layout | Wraps the entire app in `AuthProvider` + `ToastProvider`. Sets Geist fonts and base HTML structure. |
| `page.tsx` | `/` | Landing page. Shows project description, role/routing/security features. Links to login or dashboard based on auth state. |
| `globals.css` | — | Global Tailwind CSS imports. |

## Subdirectories

| Directory | Route | Purpose |
|-----------|-------|---------|
| `login/` | `/login` | Google Sign-In page via Firebase Auth popup. |
| `dashboard/` | `/dashboard/*` | Protected dashboard area with role-specific sub-pages. |

## Routing Flow

```
/ (landing)
  → /login (Google Sign-In)
  → /dashboard (gateway — auto-redirects by role)
     → /dashboard/admin/* (admin/superadmin CRUD pages)
     → /dashboard/hod (HOD department view)
     → /dashboard/faculty (faculty assigned sections)
     → /dashboard/student (student enrolled courses)
     → /dashboard/supervisor (supervisor overview)
```
