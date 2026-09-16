# ui/ — UI Primitives

Low-level, reusable UI components used by all admin CRUD pages and dashboards.

## Files

| File | Component | Purpose |
|------|-----------|---------|
| `DataTable.tsx` | `DataTable<T>` | Generic data table with column config, loading skeleton, search bar, pagination controls, and per-row action buttons (edit/delete/custom). Used by every admin list page. |
| `FormModal.tsx` | `FormModal` | Modal dialog for create/edit forms. Supports configurable size (`sm`/`md`/`lg`/`xl`), a submit button with loading state, and backdrop blur overlay. Wraps children in a `<form>` when `onSubmit` is provided. |
| `FormField.tsx` | `FormField` | Labeled form field wrapper with label, hint text, and error message display. Accepts children (the actual input element). |
| `ConfirmDialog.tsx` | `ConfirmDialog` | Confirmation modal for destructive actions (delete). Shows title, message, cancel/confirm buttons with loading state. |
| `Toast.tsx` | `ToastProvider` + `useToast` | Global toast notification system. Context-based. Shows success (black border) or error (red border) messages that auto-dismiss after 4 seconds. Positioned bottom-right. |

## How They Connect

- **DataTable** → used by all `dashboard/admin/*/page.tsx` pages.
- **FormModal** + **FormField** → used together for create/edit operations.
- **ConfirmDialog** → used for delete confirmations.
- **ToastProvider** → mounted in `app/layout.tsx`, consumed via `useToast()` hook in any page.
