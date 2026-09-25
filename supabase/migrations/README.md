# QuickServe Supabase Migrations

This directory contains versioned PostgreSQL migrations executed on the Supabase database.

### Planned Migrations Sequence
1. `20260925000001_initial_schema.sql` (Phase 2):
   - PostgreSQL enums: `user_role`, `request_priority`, `request_status`, `audit_action`.
   - Core tables: `profiles`, `services`, `service_requests`, `request_status_history`, `audit_logs`.
   - Primary keys, foreign keys, not-null constraints, unique checks, performance indexes.
   - Seed services: AC Servicing, Plumbing, Electrical, Cleaning.

2. `20260925000002_rls_policies.sql` (Phase 4):
   - Row Level Security (RLS) activation on all public tables.
   - Customer isolation policies.
   - Agent assigned-only access policies.
   - Admin operational visibility and dispatch policies.

3. `20260925000003_state_machine_triggers.sql` (Phase 6):
   - Request number generator trigger (`REQ-YYYY-XXXXXX`).
   - State transition validation trigger (prevents illegal jumps).
   - Automated `request_status_history` capture.

4. `20260925000004_audit_and_history.sql` (Phase 10):
   - Secure logging procedure for `audit_logs` without credential exposure.
