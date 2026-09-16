# AtlasAI Academic Management Platform

AtlasAI is a full-stack, highly optimized academic management platform. It uses a modern decoupled architecture featuring a Next.js (React 19) frontend and an Express/TypeScript backend backed by MongoDB and Redis.

## ✨ Core Features

AtlasAI is designed to handle the complete lifecycle of university administration and Outcome-Based Education (OBE).

* **Organizational Hierarchy**: Complete CRUD for Departments, Degree Programs, and Student Batches.
* **Academic Lifecycle**: Manage active/upcoming Semesters, Course Catalogs, and assign Teachers to specific Course Offerings per section.
* **Outcome-Based Education (OBE)**: Define Course Outcomes (COs) and map them to Program Outcomes (POs).
* **Assessments & Grading**: Create Exam templates with specific question-level marks mapped directly to COs to calculate student attainment.
* **Enrollment & Sections**: Robust mapping of students to specific sections (`SectionAssignments`) and course enrollments.
* **Role-Based Access Control**: Granular permissions scaling from Superadmins to Department Admins, Teachers, and Students.
* **Student Insights & AI**: Built-in modules to run analytics on student performance and leverage AI for academic insights.

## 🏗 High-Level Architecture

The project is structured as a monorepo with distinct client and server directories to enforce separation of concerns while allowing shared typings where applicable.

- **Frontend (`client/`)**: Next.js App Router providing a reactive, role-gated UI.
- **Backend (`server/`)**: Express API utilizing a strict `Controller → Service → Model` feature-module pattern.
- **Authentication**: Firebase Authentication. The client retrieves short-lived JWTs, which the server verifies and enriches via Firebase Admin and custom MongoDB role synchronization.

## 🛠 Tech Stack

**Client**
* **Framework**: Next.js 16 (App Router), React 19
* **Styling**: Tailwind CSS v4
* **Data Visualization & Export**: Recharts, jsPDF, XLSX
* **API Client**: Axios (with centralized interceptors)

**Server**
* **Runtime & Framework**: Node.js, Express.js (v5)
* **Language**: TypeScript
* **Database & Cache**: MongoDB (Mongoose ODM), Redis
* **Validation & Logging**: Zod, Pino

## 🧠 Core Architecture Patterns

### Backend: Feature-Module Pattern
The backend avoids bloated, monolithic route files. Every domain entity (e.g., Users, Courses, Departments) lives in a self-contained module (`server/src/modules/`) encompassing its own Routes, Controller, Service, Model, and Zod Validation schemas.

### Backend: Request Context (AsyncLocalStorage)
AtlasAI completely eliminates prop-drilling for context like `userId` or `requestId`. It uses Node.js `AsyncLocalStorage` via `contextMiddleware`. Mongoose plugins intercept database writes and automatically extract the current user from context to populate `createdBy`, `updatedBy`, or `deletedBy` fields seamlessly.

### Frontend: Role-Based Guards & Interceptors
The client secures routes using a custom `<RoleGuard />` wrapper that interfaces with the global `AuthContext`. Outbound requests don't manually deal with tokens; a centralized Axios interceptor intercepts all requests, retrieves the latest Firebase Bearer token, and attaches it.

## ⚡ Key Optimizations & Infrastructure

AtlasAI incorporates enterprise-grade performance and reliability patterns:

1. **Read-Through Caching (`cacheAside`)**
   Heavy database reads are wrapped in a generic `cacheAside` utility. If Redis is available, it serves the data to ensure sub-millisecond read latency. If Redis fails or the key is absent, it gracefully falls back to MongoDB and populates the cache in the background.

2. **Advanced Query Builder**
   A centralized `QueryBuilder` wraps Mongoose queries to provide standardized, highly optimized pagination, filtering, searching, and sorting out of the box, mitigating N+1 query problems and standardizing API shapes.

3. **Soft-Delete & Audit Architectures**
   Data is never hard-deleted. A custom `softDeletePlugin` automatically intercepts `find()` queries to exclude deleted documents (unless explicitly requested). An `auditPlugin` automatically tracks creation and modification metadata across all entities.

4. **Resilient Transactions**
   Multi-document updates are wrapped in a `withTransaction` utility that attempts MongoDB native sessions and gracefully degrades to standard operations if a replica set isn't available (e.g., in local dev environments).

5. **Zod Validation & Consistent Responses**
   Input validation happens at the boundary edge (Express middleware) using strictly typed Zod schemas. Output is guaranteed to follow a standard `{ success, data, meta }` wrapper, preventing malformed UI rendering.

## 📁 Repository Structure

```
.
├── client/
│   ├── src/app/          # Next.js App Router pages
│   ├── src/components/   # Shared UI & Layouts
│   ├── src/context/      # Global state (Auth, Theme)
│   ├── src/lib/          # Axios interceptors & Firebase init
│   └── src/hooks/        # Custom React hooks
│
└── server/
    ├── src/config/       # Environment & Infrastructure setup
    ├── src/core/         # Shared plugins, middleware, utils, and custom errors
    ├── src/middlewares/  # Authentication & Role guards
    ├── src/models/       # Cross-module Mongoose models
    └── src/modules/      # Isolated feature modules (Routes/Controllers/Services)
```

## 🚀 Getting Started

Ensure you have Node.js 20+, MongoDB, and Redis running locally. You will also need a Firebase project set up.

1. **Install Dependencies**
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

2. **Environment Variables**
   - Copy `server/.env.example` to `server/.env` and populate your MongoDB URI, Redis URL, and Firebase Admin credentials.
   - Set up the client environment variables for the Firebase Client SDK.

3. **Run Development Servers**
   - **Backend**: `cd server && npm run dev`
   - **Frontend**: `cd client && npm run dev`
