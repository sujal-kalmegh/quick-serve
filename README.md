# QuickServe: Service Request Management System

[![Node.js](https://img.shields.io/badge/Node.js-18%2B%20%7C%2020%2B-brightgreen)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19.x-blue)](https://react.dev/)
[![Flutter](https://img.shields.io/badge/Flutter-3.x-02569B)](https://flutter.dev/)
[![Supabase](https://img.shields.io/badge/Backend-Supabase%20%2F%20PostgreSQL-3ECF8E)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-lightgrey.svg)](LICENSE)

An enterprise-grade Service Request Management System engineered for the **SWASIQ Technology Internship Technical Assignment**. QuickServe manages the end-to-end lifecycle of home and facility services (such as AC Servicing, Plumbing, Electrical, and Cleaning) through a unified backend architecture.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Monorepo Directory Layout](#monorepo-directory-layout)
3. [Prerequisites](#prerequisites)
4. [Step-by-Step Setup Guide](#step-by-step-setup-guide)
   - [1. Clone Repository](#1-clone-repository)
   - [2. Database & Supabase Setup](#2-database--supabase-setup)
   - [3. Configure Environment Variables](#3-configure-environment-variables)
   - [4. Run the React Web / Admin Portal](#4-run-the-react-web--admin-portal)
   - [5. Run the Flutter Mobile Application](#5-run-the-flutter-mobile-application)
5. [Core Concepts & Business Rules](#core-concepts--business-rules)
6. [Testing & Verification](#testing--verification)
7. [Troubleshooting & Common Questions](#troubleshooting--common-questions)

---

## System Architecture

QuickServe bridges **Flutter Mobile** (Customers & Field Agents) and **React Admin Web** (Operations & Dispatchers) through a secured **Supabase PostgreSQL** instance:

```
                            QUICKSERVE MONOREPO
                                     │
          ┌──────────────────────────┴──────────────────────────┐
          ▼                                                     ▼
   Flutter Mobile Client                               React Admin Portal
 (Customers & Technicians)                            (Operations & Dispatch)
          │                                                     │
          └──────────────────────────┬──────────────────────────┘
                                     │ HTTPS / WSS
                                     ▼
                          Supabase Managed Backend
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
          Supabase Auth                         PostgreSQL 15+ Engine
      (JWT Session Tokens)                               │
                                     ┌───────────────────┴───────────────────┐
                                     ▼                                       ▼
                           Row Level Security (RLS)              Automated Triggers
                          (Role & Data Isolation)              (State Machine & Audit)
```

### Core User Roles
* **CUSTOMER**: Registers and logs in, browses service offerings, books requests, tracks real-time status history, and cancels eligible requests.
* **AGENT**: Views assigned service requests, accepts tasks, updates live progress, and records technical completion notes.
* **ADMIN**: Oversees global service requests, dispatches unassigned tasks to available agents, audits status history, and monitors platform analytics.

---

## Monorepo Directory Layout

```
quickserve/
├── .env.example                         # Environment template (public anon keys only)
├── package.json                         # Node dependencies for the Web Admin portal
├── vite.config.ts                       # Vite bundling configuration
├── tsconfig.json                        # TypeScript configuration
├── docs/                                # Technical & design specifications
│   ├── architecture.md                  # Comprehensive system architecture
│   ├── database.md                      # Relational schema & integrity rules
│   └── security.md                      # RBAC, RLS policies & audit specs
├── supabase/
│   ├── config.toml                      # Supabase local CLI configuration
│   └── migrations/                      # Sequential SQL database migrations
│       ├── 20260925000001_initial_schema.sql
│       ├── 20260925000002_auth_sync_trigger.sql
│       ├── 20260925000003_rls_policies.sql
│       └── 20260925000004_request_number_trigger.sql
├── mobile/quickserve_mobile/            # Flutter mobile codebase
│   ├── pubspec.yaml                     # Flutter package dependencies
│   ├── lib/
│   │   ├── main.dart                    # Mobile app entry point & Supabase init
│   │   ├── core/config/                 # Environment & configuration constants
│   │   ├── models/                      # Type-safe Dart domain entities
│   │   ├── repositories/                # Data access layer (CustomerRepository)
│   │   ├── services/                    # Auth & identity service
│   │   └── screens/                     # Customer mobile UI screens
│   └── test/
│       └── customer_flow_test.dart      # Flutter unit & business rule tests
└── src/                                 # React Admin Portal codebase
    ├── App.tsx                          # Root React view
    ├── types/database.ts                # TypeScript entity contracts
    ├── services/                        # Supabase client singleton & auth
    └── components/                      # Modular UI views & test harness
```

---

## Prerequisites

Before starting, ensure your system has the following installed:

* **Node.js**: `v18.0.0` or higher (LTS `v20.x` recommended)
* **npm**: `v9.0.0` or higher
* **Flutter SDK**: `3.x` with Dart `3.x` (required only for mobile development)
* **Git**: `2.x+`
* **Supabase Account**: A free Supabase project at [supabase.com](https://supabase.com), or the [Supabase CLI](https://supabase.com/docs/guides/cli) for local development.

---

## Step-by-Step Setup Guide

### 1. Clone Repository

```bash
git clone https://github.com/your-username/quickserve.git
cd quickserve
```

---

### 2. Database & Supabase Setup

QuickServe enforces database-first authorization and automated sequence numbering via PostgreSQL triggers.

#### Option A: Using the Supabase Dashboard (Recommended for fast setup)
1. Log in to your [Supabase Dashboard](https://app.supabase.com) and create a new project.
2. In the left navigation, open **SQL Editor**.
3. Execute the SQL files located in `supabase/migrations/` in sequential order:
   - `supabase/migrations/20260925000001_initial_schema.sql` (Creates enums, tables, indexes, and seed services)
   - `supabase/migrations/20260925000002_auth_sync_trigger.sql` (Auto-creates profile rows on Auth signup)
   - `supabase/migrations/20260925000003_rls_policies.sql` (Applies Row Level Security policies)
   - `supabase/migrations/20260925000004_request_number_trigger.sql` (Sequence `REQ-YYYY-XXXXXX` and status history tracking)

#### Option B: Using the Supabase CLI
```bash
# Link your local project to your remote Supabase instance
supabase link --project-ref your-project-ref

# Apply all database migrations
supabase db push
```

---

### 3. Configure Environment Variables

Create your local `.env` file from the provided template:

```bash
cp .env.example .env
```

Open `.env` and supply your Supabase project credentials (obtain these from **Project Settings $\to$ API** in the Supabase Dashboard):

```env
# Supabase Project URL (e.g., https://xyzcompany.supabase.co)
VITE_SUPABASE_URL=https://your-project-id.supabase.co

# Supabase Anonymous Public Key (Safe for browser / mobile clients)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> **Security Rule**: Never expose your `service_role` secret key in `.env` or client applications. The `VITE_SUPABASE_ANON_KEY` respects Row Level Security (RLS).

---

### 4. Run the React Web / Admin Portal

Install dependencies and start the Vite development server:

```bash
# Install node packages
npm install

# Start the dev server
npm run dev
```

Open your browser to [http://localhost:3000](http://localhost:3000).

#### Seeded Test Accounts
The application includes quick 1-click test credential chips on the login screen:
* **Customer**: `customer@quickserve.dev` / `customer123`
* **Field Agent**: `agent@quickserve.dev` / `agent123`
* **Administrator**: `admin@quickserve.dev` / `admin123`

---

### 5. Run the Flutter Mobile Application

Navigate to the mobile directory:

```bash
cd mobile/quickserve_mobile

# Install Flutter dependencies
flutter pub get
```

#### Running on Chrome / Web
```bash
flutter run -d chrome \
  --dart-define=SUPABASE_URL=https://your-project-id.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=your-anon-key
```

#### Running on Android / iOS Simulator
```bash
# Verify available devices
flutter devices

# Launch on connected simulator or device
flutter run \
  --dart-define=SUPABASE_URL=https://your-project-id.supabase.co \
  --dart-define=SUPABASE_ANON_KEY=your-anon-key
```

---

## Core Concepts & Business Rules

### 1. Request Lifecycle State Machine
Service requests transition through an immutable state machine:

```
[ CREATED ] ──(Admin assigns)──> [ ASSIGNED ] ──(Agent accepts)──> [ ACCEPTED ]
     │                                │                                │
     │ (Customer cancels)             │ (Customer cancels)             │ (Agent begins)
     ▼                                ▼                                ▼
[ CANCELLED ]                   [ CANCELLED ]                   [ IN_PROGRESS ]
                                                                       │
                                                                       │ (Agent completes)
                                                                       ▼
                                                                [ COMPLETED ]
```

### 2. Customer Cancellation Eligibility Rule
* A customer **can only cancel** when the status is `CREATED` or `ASSIGNED`.
* Once an agent transitions the request to `ACCEPTED`, `IN_PROGRESS`, or `COMPLETED`, customer cancellation is barred by both the Flutter UI (`canCancel`) and the PostgreSQL database RLS policy.

### 3. Customer Identity Isolation (`customer_id`)
* When booking a service request, the client **never** specifies `customer_id` in the UI form.
* `CustomerRepository` authoritatively extracts `auth.currentUser!.id` from the authenticated session, preventing Insecure Direct Object References (IDOR).
* The database generates sequential tracking numbers formatted as `REQ-YYYY-XXXXXX` via `trg_service_request_defaults`.

---

## Testing & Verification

### TypeScript Lint & Typecheck
```bash
# Run TypeScript compilation check
npm run lint

# Or run tsc directly
npx tsc --noEmit
```

### React Production Build
```bash
npm run build
```

### Flutter Unit & Business Rule Tests
Run the Flutter test suite to verify model parsing, priority mappings, and cancellation rules:

```bash
cd mobile/quickserve_mobile
flutter test
```

Expected test output:
```
00:01 +7: All tests passed!
```

---

## Troubleshooting & Common Questions

#### 1. "Invalid login credentials" or Rate Limit (429) during login
* **Cause**: On newly provisioned Supabase free tier instances, automated signups trigger default email verification rate limits (`over_email_send_rate_limit`).
* **Solution**: Use the 1-click **Autofill Demo Credentials** chips on the login screen (`Customer`, `Agent`, or `Admin`). The authentication service features an offline-resilient fallback that provisions local session persistence if remote auth confirmation is pending.

#### 2. `Could not find the table 'public.services' in the schema cache` (PGRST205)
* **Cause**: Database migrations have not been applied to your Supabase project yet.
* **Solution**: Open the Supabase **SQL Editor** and run `supabase/migrations/20260925000001_initial_schema.sql` through `20260925000004_request_number_trigger.sql`.

#### 3. Flutter mobile app displays placeholder data or network error
* **Cause**: Missing `--dart-define` parameters when launching Flutter.
* **Solution**: Pass your credentials when executing `flutter run`:
  ```bash
  flutter run --dart-define=SUPABASE_URL=https://<your-id>.supabase.co --dart-define=SUPABASE_ANON_KEY=<your-key>
  ```

---

## Documentation Links
* [Architecture Blueprint](docs/architecture.md)
* [Relational Database Schema](docs/database.md)
* [Security, RBAC & Audit Specification](docs/security.md)

---

## Contributing & Development Workflow
1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Commit your changes: `git commit -m "feat: descriptive commit message"`
3. Verify builds and tests: `npm run lint && npm run build` (and `flutter test` for mobile)
4. Submit a Pull Request against the `main` branch.
