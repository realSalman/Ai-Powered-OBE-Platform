# login/ — Login Page

Route: `/login`

## What It Does

- Renders a minimal sign-in card with "Continue with Google" button.
- Uses `signInWithPopup()` from Firebase Auth to authenticate via Google.
- Sends the Firebase ID token to the server's `POST /api/auth/login` endpoint via `AuthContext.login()`.
- On success: redirects to `/dashboard`. On 403: shows "Access Denied" (email not assigned a role).
- If Firebase is not configured (missing env vars), shows a warning and disables the button.

## Connections

- **Uses**: `AuthContext` (login function), `lib/firebase.ts` (auth instance, Google provider).
- **Server endpoint**: `POST /api/auth/login` → `verifyToken` middleware.
- **Redirects to**: `/dashboard` on successful login.
