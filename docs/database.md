# QuickServe Database Schema & Design Documentation

## 1. Architectural Philosophy
The QuickServe database design adheres to three core engineering principles:
1. **Database-Enforced Referential Integrity**: Foreign keys, check constraints, and non-nullable requirements are strictly enforced by PostgreSQL, not delegated solely to frontend validation.
2. **Defensive Data Types & Enums**: Categorical fields (`user_role`, `request_priority`, `request_status`, `audit_action`) utilize PostgreSQL native `ENUM` types to prevent invalid states at insertion time.
3. **Auditable Immutability**: Historical status changes and security audit events reside in append-only tables (`request_status_history`, `audit_logs`) to ensure forensic traceability.

---

## 2. Enumeration Types

| Enum Name | Allowed Values | Usage |
| :--- | :--- | :--- |
| `user_role` | `'CUSTOMER'`, `'AGENT'`, `'ADMIN'` | Controls user permission boundaries. |
| `request_priority` | `'LOW'`, `'MEDIUM'`, `'HIGH'` | SLA scheduling prioritization. |
| `request_status` | `'CREATED'`, `'ASSIGNED'`, `'ACCEPTED'`, `'IN_PROGRESS'`, `'COMPLETED'`, `'CANCELLED'` | Strict state machine lifecycle states. |
| `audit_action` | `'LOGIN_SUCCESS'`, `'REQUEST_CREATED'`, `'REQUEST_ASSIGNED'`, `'REQUEST_UPDATED'`, `'AUTHORIZATION_FAILED'`, `'DATABASE_ERROR'` | Security telemetry event classifications. |

---

## 3. Tables & Schema Specifications

### A. `profiles`
Represents application actors (Customers, Field Agents, System Administrators). Linked 1:1 with Supabase Auth (`auth.users`).

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Internal surrogate identifier. |
| `auth_user_id` | `UUID` | `NOT NULL`, `UNIQUE` | Foreign reference to Supabase `auth.users.id`. |
| `full_name` | `VARCHAR(150)` | `NOT NULL`, `CHECK (length >= 2)` | User's legal or professional name. |
| `email` | `VARCHAR(255)` | `NOT NULL`, `UNIQUE`, `CHECK (regex)` | Normalized email address. |
| `phone` | `VARCHAR(30)` | `CHECK (regex)` | Contact phone number. |
| `role` | `user_role` | `NOT NULL`, `DEFAULT 'CUSTOMER'` | RBAC authorization role. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | Record creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | Auto-updated via trigger. |

### B. `services`
Master catalog of available service offerings.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Service offering UUID. |
| `name` | `VARCHAR(100)` | `NOT NULL`, `UNIQUE`, `CHECK (length >= 2)` | Name of the service offering. |
| `description` | `TEXT` | `NOT NULL`, `CHECK (length >= 10)` | Detailed description of scope of work. |
| `icon` | `VARCHAR(50)` | `NOT NULL`, `DEFAULT 'wrench'` | Icon key identifier for mobile/web UI. |
| `is_active` | `BOOLEAN` | `NOT NULL`, `DEFAULT TRUE` | Active visibility flag. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | Catalog creation timestamp. |

### C. `service_requests`
The central transactional record capturing a customer's maintenance request.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Request UUID. |
| `request_number` | `VARCHAR(30)` | `NOT NULL`, `UNIQUE` | Unique human-friendly ID (e.g. `REQ-2026-000123`). |
| `customer_id` | `UUID` | `NOT NULL`, `REFERENCES profiles(id) ON DELETE RESTRICT` | Profile ID of the customer who booked the request. |
| `agent_id` | `UUID` | `REFERENCES profiles(id) ON DELETE SET NULL` | Profile ID of the field agent assigned (nullable on creation). |
| `service_id` | `UUID` | `NOT NULL`, `REFERENCES services(id) ON DELETE RESTRICT` | Catalog service requested. |
| `description` | `TEXT` | `NOT NULL`, `CHECK (length >= 10)` | Customer's description of the problem/requirements. |
| `preferred_date` | `DATE` | `NOT NULL` | Scheduled date of service. |
| `preferred_time` | `VARCHAR(20)` | `NOT NULL` | Scheduled time window (e.g., "10:00 - 12:00"). |
| `address` | `TEXT` | `NOT NULL`, `CHECK (length >= 5)` | On-site physical service address. |
| `priority` | `request_priority` | `NOT NULL`, `DEFAULT 'MEDIUM'` | Priority level (`LOW`, `MEDIUM`, `HIGH`). |
| `status` | `request_status` | `NOT NULL`, `DEFAULT 'CREATED'` | Current state machine lifecycle position. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | Creation timestamp. |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | Auto-updated via trigger. |

**Check Constraints:**
- `chk_agent_assignment`: Enforces that when `status = 'CREATED'`, `agent_id` must be `NULL`.

### D. `request_status_history`
Append-only chronological audit log of all request lifecycle transitions.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | History record UUID. |
| `request_id` | `UUID` | `NOT NULL`, `REFERENCES service_requests(id) ON DELETE CASCADE` | Associated request. |
| `old_status` | `request_status` | Nullable (NULL for the initial `CREATED` step) | Status before transition. |
| `new_status` | `request_status` | `NOT NULL` | Status after transition. |
| `changed_by` | `UUID` | `NOT NULL`, `REFERENCES profiles(id) ON DELETE RESTRICT` | User who initiated the state change. |
| `note` | `TEXT` | Nullable | Work summary, rejection reason, or completion note. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | Timestamp transition occurred. |

### E. `audit_logs`
Immutable security event log for security auditing, forensics, and operational observability.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Log event UUID. |
| `actor_id` | `UUID` | `REFERENCES profiles(id) ON DELETE SET NULL` | User performing the action (nullable for unauthenticated attempts). |
| `action` | `audit_action` | `NOT NULL` | Structured action code. |
| `entity_type` | `VARCHAR(50)` | `NOT NULL` | Target table or domain resource name. |
| `entity_id` | `VARCHAR(100)` | Nullable | Identifier of affected entity. |
| `metadata` | `JSONB` | `NOT NULL`, `DEFAULT '{}'::jsonb` | Contextual parameters (never secrets or tokens). |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL`, `DEFAULT NOW()` | Event occurrence timestamp. |

---

## 4. Query Path Optimization & Indexes

| Index Name | Table | Columns | Technical Rationale |
| :--- | :--- | :--- | :--- |
| `idx_profiles_auth_user_id` | `profiles` | `auth_user_id` | Accelerates 1:1 profile resolution during user login and token decoding. |
| `idx_profiles_role` | `profiles` | `role` | Optimizes admin queries filtering lists of available Agents and registered Customers. |
| `idx_requests_customer_id` | `service_requests` | `customer_id` | Optimizes the Customer's "My Requests" query path ($O(\log N)$ scan). |
| `idx_requests_agent_id` | `service_requests` | `agent_id` | Optimizes the Agent's "Assigned Requests" queue view. |
| `idx_requests_status` | `service_requests` | `status` | Accelerates dashboard metric counters and operations dispatch queries. |
| `idx_requests_service_id` | `service_requests` | `service_id` | Speeds up catalog-level aggregation and filtering. |
| `idx_requests_created_at` | `service_requests` | `created_at DESC` | Powers chronological pagination in the Admin Portal. |
| `idx_history_request_id` | `request_status_history` | `request_id, created_at ASC` | Fast retrieval of the chronological timeline on the Request Details screen. |
| `idx_audit_logs_actor_id` | `audit_logs` | `actor_id` | Enables filtering audit trails by specific actors. |
| `idx_audit_logs_created_at` | `audit_logs` | `created_at DESC` | Accelerates admin audit log feeds with cursor-based or offset pagination. |

---

## 5. Seed Data Verification
The migration seeds four active facility maintenance services:
1. **AC Servicing**: Comprehensive air conditioning inspection, deep filter cleansing, refrigerant check, and performance tuning.
2. **Plumbing**: Diagnostic leak repair, pipe fixtures, unclogging, water heater maintenance, and sanitary installations.
3. **Electrical**: Circuit inspection, panel maintenance, appliance wiring, lighting setup, and electrical fault troubleshooting.
4. **Cleaning**: Deep home and office sanitization, vacuuming, floor polishing, and post-maintenance cleanup.
