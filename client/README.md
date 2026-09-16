# Client — AtlasAI Frontend

Next.js (App Router) + TypeScript frontend for the AtlasAI academic management platform.

## Tech Stack

- **Framework**: Next.js 15 (App Router, client-side rendering)
- **Language**: TypeScript + TSX
- **Styling**: Tailwind CSS (monochrome zinc palette, monospace typography)
- **Auth**: Firebase Auth (Google Sign-In popup) + server-side JWT verification
- **HTTP Client**: Axios with Firebase token auto-injection
- **Fonts**: Geist Sans + Geist Mono (Google Fonts)

## Architecture

```
client/
├── src/
│   ├── app/           # Next.js App Router pages + layouts
│   ├── components/    # Reusable UI components
│   ├── context/       # React context providers (auth state)
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utilities (API client, Firebase config)
│   └── types/         # TypeScript interfaces for API data shapes
```

## Auth Flow

1. User clicks "Continue with Google" on `/login`.
2. Firebase Auth opens a Google Sign-In popup → returns a Firebase ID token.
3. Client sends the token to `POST /api/auth/login` on the server.
4. Server verifies the token, looks up the user in MongoDB, injects custom claims, and returns user data.
5. `AuthContext` stores the user data. `onAuthStateChanged` re-authenticates on page refresh.
6. Role-based routing: `/dashboard` gateway redirects to the correct role-specific dashboard.

## How It Connects to the Server

- `lib/api.ts` creates an Axios instance pointing at `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:5000/api`).
- A request interceptor auto-attaches the Firebase `Bearer` token to every request.
- All API responses follow the `{ success, data, meta? }` shape defined in `types/api.ts`.
