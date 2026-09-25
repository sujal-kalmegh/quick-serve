/**
 * QuickServe Administration Shell (Phase 1)
 * SWASIQ Technology Internship Technical Assignment
 */

import React, { useState } from 'react';
import { TopBar } from './components/layout/TopBar';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AuthTestHarness } from './components/auth/AuthTestHarness';
import { RlsTestHarness } from './components/security/RlsTestHarness';
import { isSupabaseConfigured } from './services/supabaseClient';
import { 
  Database, 
  Smartphone, 
  Monitor, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  GitBranch, 
  FolderTree, 
  FileCode,
  ArrowRight,
  Server,
  Layers,
  KeyRound
} from 'lucide-react';

function AdminShell() {
  const [activeTab, setActiveTab] = useState('auth');
  const { session } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col font-sans">
      <TopBar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* Banner Notice */}
        <div className="mb-8 p-4 bg-white border border-zinc-200 rounded-lg flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <p className="text-sm font-semibold text-zinc-900">
                Phase 4 Complete: RBAC & PostgreSQL Row Level Security (RLS) Active
              </p>
              <p className="text-xs text-zinc-500">
                Customer, Agent, and Admin policies enforced at PostgreSQL level. All 7 cross-isolation tests verified.
              </p>
            </div>
          </div>
          <div className="text-xs text-zinc-500 font-mono">
            {session ? `Active: ${session.user.role} (${session.user.fullName})` : 'Status: Ready for Phase 5 (Flutter Customer App)'}
          </div>
        </div>

        {/* Tab: Authentication */}
        {activeTab === 'auth' && (
          <div className="space-y-6">
            <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-xs">
              <h2 className="text-lg font-semibold text-zinc-950 mb-1">
                Supabase Authentication & Profile Engine
              </h2>
              <p className="text-xs text-zinc-600 mb-6">
                All 5 core requirements implemented: Registration, Login, Logout, Session Persistence, and Password Reset.
              </p>
              <AuthTestHarness />
            </div>
          </div>
        )}

        {/* Tab: RLS & Security */}
        {activeTab === 'rls' && (
          <div className="space-y-6">
            <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-xs">
              <h2 className="text-lg font-semibold text-zinc-950 mb-1">
                PostgreSQL Row Level Security (RLS) & RBAC Engine
              </h2>
              <p className="text-xs text-zinc-600 mb-6">
                Database-level authorization verification. Tests verify Customer isolation, Agent isolation, and Admin guardrails.
              </p>
              <RlsTestHarness />
            </div>
          </div>
        )}

        {/* Tab 1: System Architecture */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <section className="bg-white border border-zinc-200 rounded-lg p-6 shadow-xs">
              <h2 className="text-lg font-semibold text-zinc-950 mb-2">1. System Architecture</h2>
              <p className="text-sm text-zinc-600 mb-6">
                Dual-client architecture communicating through Supabase PostgREST & Auth. Strict PostgreSQL Row Level Security (RLS) guarantees complete tenant and role isolation at the database layer.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Mobile Client Box */}
                <div className="border border-zinc-200 rounded-lg p-5 bg-zinc-50/50">
                  <div className="flex items-center gap-2 mb-3 text-zinc-900 font-medium">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    <span>Flutter Mobile Client</span>
                  </div>
                  <p className="text-xs text-zinc-600 mb-3">
                    Targeted at <strong>Customers</strong> and <strong>Agents</strong>. Handles service request bookings, real-time status updates, and agent execution workflows.
                  </p>
                  <ul className="text-xs text-zinc-500 space-y-1 font-mono">
                    <li>· Path: mobile/quickserve_mobile/</li>
                    <li>· Framework: Flutter 3.x + Dart</li>
                    <li>· SDK: supabase_flutter</li>
                  </ul>
                </div>

                {/* Admin Client Box */}
                <div className="border border-zinc-200 rounded-lg p-5 bg-zinc-50/50">
                  <div className="flex items-center gap-2 mb-3 text-zinc-900 font-medium">
                    <Monitor className="w-4 h-4 text-indigo-600" />
                    <span>React Admin Portal</span>
                  </div>
                  <p className="text-xs text-zinc-600 mb-3">
                    Targeted at <strong>Administrators</strong>. High-density operations dashboard for real-time dispatch, agent assignment, customer inspection, and audit log analysis.
                  </p>
                  <ul className="text-xs text-zinc-500 space-y-1 font-mono">
                    <li>· Path: quickserve_admin / src/</li>
                    <li>· Framework: React 19 + Vite + Tailwind</li>
                    <li>· Client: @supabase/supabase-js</li>
                  </ul>
                </div>
              </div>

              {/* Backend Layer */}
              <div className="mt-6 border border-zinc-200 rounded-lg p-5 bg-white">
                <div className="flex items-center gap-2 mb-3 text-zinc-900 font-medium">
                  <Server className="w-4 h-4 text-emerald-600" />
                  <span>Backend & Database Layer (Supabase + PostgreSQL)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-zinc-50 rounded border border-zinc-100">
                    <div className="font-semibold text-zinc-800 mb-1">Supabase Auth</div>
                    <div className="text-zinc-600">JWT-based user sessions, password resets, and automatic profile generation trigger.</div>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded border border-zinc-100">
                    <div className="font-semibold text-zinc-800 mb-1">Row Level Security (RLS)</div>
                    <div className="text-zinc-600">Database-enforced isolation. Customer A cannot view Customer B's records; Agent only views assigned tasks.</div>
                  </div>
                  <div className="p-3 bg-zinc-50 rounded border border-zinc-100">
                    <div className="font-semibold text-zinc-800 mb-1">Triggers & Audit Engine</div>
                    <div className="text-zinc-600">State machine verification trigger and immutable audit log captures with sanitized telemetry.</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Implementation Progress Roadmap */}
            <section className="bg-white border border-zinc-200 rounded-lg p-6 shadow-xs">
              <h2 className="text-lg font-semibold text-zinc-950 mb-4">Milestone Progress</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-medium text-emerald-800">PHASE 1</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-900 mb-1">Project Setup & Shells</h3>
                  <p className="text-xs text-zinc-600">Monorepo structure, Flutter shell, React admin shell, types.</p>
                </div>

                <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-medium text-emerald-800">PHASE 2</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-900 mb-1">Database Schema</h3>
                  <p className="text-xs text-zinc-600">PostgreSQL tables, enums, FK constraints, indexes, seeds.</p>
                </div>

                <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-medium text-emerald-800">PHASE 3</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-900 mb-1">Authentication</h3>
                  <p className="text-xs text-zinc-600">Supabase Auth, profile synchronization, login/register.</p>
                </div>

                <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/40">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-medium text-emerald-800">PHASE 4</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-zinc-900 mb-1">RLS & RBAC</h3>
                  <p className="text-xs text-zinc-600">PostgreSQL RLS policies, tenant isolation, tests.</p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Tab 2: Database Contracts */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-xs">
              <h2 className="text-lg font-semibold text-zinc-950 mb-2">Core Database Entities</h2>
              <p className="text-sm text-zinc-600 mb-6">
                Defined in <code className="text-xs font-mono bg-zinc-100 px-1 py-0.5 rounded">src/types/database.ts</code> and mirrored in Dart models at <code className="text-xs font-mono bg-zinc-100 px-1 py-0.5 rounded">mobile/.../models/models.dart</code>.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50/50">
                  <div className="text-sm font-semibold text-zinc-900 mb-1">profiles</div>
                  <div className="text-xs text-zinc-500 mb-2 font-mono">id (UUID PK), auth_user_id (FK), full_name, email, phone, role (ENUM)</div>
                  <p className="text-xs text-zinc-600">1:1 mirror of Supabase Auth users. Roles: CUSTOMER, AGENT, ADMIN.</p>
                </div>

                <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50/50">
                  <div className="text-sm font-semibold text-zinc-900 mb-1">services</div>
                  <div className="text-xs text-zinc-500 mb-2 font-mono">id (UUID PK), name, description, icon, is_active</div>
                  <p className="text-xs text-zinc-600">Catalog offerings: AC Servicing, Plumbing, Electrical, Cleaning.</p>
                </div>

                <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50/50">
                  <div className="text-sm font-semibold text-zinc-900 mb-1">service_requests</div>
                  <div className="text-xs text-zinc-500 mb-2 font-mono">id, request_number, customer_id, agent_id, service_id, status, priority...</div>
                  <p className="text-xs text-zinc-600">Main transactional record with auto-formatted ID (e.g. REQ-2026-000123).</p>
                </div>

                <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50/50">
                  <div className="text-sm font-semibold text-zinc-900 mb-1">request_status_history</div>
                  <div className="text-xs text-zinc-500 mb-2 font-mono">id, request_id, old_status, new_status, changed_by, note</div>
                  <p className="text-xs text-zinc-600">Immutable chronological trail of every status transition.</p>
                </div>

                <div className="border border-zinc-200 rounded-lg p-4 bg-zinc-50/50 md:col-span-2">
                  <div className="text-sm font-semibold text-zinc-900 mb-1">audit_logs</div>
                  <div className="text-xs text-zinc-500 mb-2 font-mono">id, actor_id, action, entity_type, entity_id, metadata (JSONB)</div>
                  <p className="text-xs text-zinc-600">Security and system event audit trail. Captures LOGIN_SUCCESS, REQUEST_CREATED, REQUEST_ASSIGNED, etc.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: State Machine */}
        {activeTab === 'lifecycle' && (
          <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-xs space-y-6">
            <h2 className="text-lg font-semibold text-zinc-950 mb-2">Request Lifecycle & Transition Matrix</h2>
            <p className="text-sm text-zinc-600">
              PostgreSQL trigger procedures enforce this state machine. Client-side attempts to skip stages (e.g. CREATED $\to$ COMPLETED) are rejected at the database level.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-zinc-50 rounded-lg border border-zinc-200 text-xs font-medium">
              <span className="px-3 py-1.5 bg-white border border-zinc-300 rounded shadow-xs text-zinc-800">1. CREATED</span>
              <ArrowRight className="w-4 h-4 text-zinc-400" />
              <span className="px-3 py-1.5 bg-white border border-zinc-300 rounded shadow-xs text-zinc-800">2. ASSIGNED</span>
              <ArrowRight className="w-4 h-4 text-zinc-400" />
              <span className="px-3 py-1.5 bg-white border border-zinc-300 rounded shadow-xs text-zinc-800">3. ACCEPTED</span>
              <ArrowRight className="w-4 h-4 text-zinc-400" />
              <span className="px-3 py-1.5 bg-white border border-zinc-300 rounded shadow-xs text-zinc-800">4. IN_PROGRESS</span>
              <ArrowRight className="w-4 h-4 text-zinc-400" />
              <span className="px-3 py-1.5 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded shadow-xs">5. COMPLETED</span>
            </div>

            <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-lg text-xs text-amber-900">
              <strong>Eligible Cancellation Rule:</strong> Only requests currently in <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-300">CREATED</code> or <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-300">ASSIGNED</code> states may transition to <code className="font-mono bg-white px-1 py-0.5 rounded border border-amber-300">CANCELLED</code>.
            </div>
          </div>
        )}

        {/* Tab 4: Monorepo Tree */}
        {activeTab === 'monorepo' && (
          <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-xs space-y-6">
            <h2 className="text-lg font-semibold text-zinc-950 mb-2">Monorepo Structure</h2>
            <div className="p-4 bg-zinc-900 text-zinc-100 rounded-lg font-mono text-xs overflow-x-auto leading-relaxed">
              <pre>{`quickserve/
├── .env.example
├── .gitignore
├── README.md
├── package.json
├── metadata.json
├── index.html
├── docs/
│   ├── architecture.md
│   ├── database.md
│   └── security.md
├── supabase/
│   ├── config.toml
│   └── migrations/
│       └── README.md
├── mobile/
│   └── quickserve_mobile/
│       ├── pubspec.yaml
│       └── lib/
│           ├── core/config/supabase_config.dart
│           ├── models/models.dart
│           └── main.dart
└── src/
    ├── types/database.ts
    ├── services/supabaseClient.ts
    ├── components/layout/TopBar.tsx
    ├── App.tsx
    ├── main.tsx
    └── index.css`}</pre>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-200 bg-white py-4 px-6 text-center text-xs text-zinc-500">
        QuickServe Service Request Management System · SWASIQ Technology Internship Technical Assignment
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AdminShell />
    </AuthProvider>
  );
}
