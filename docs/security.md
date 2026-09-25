# QuickServe Security & Authorization Specification

## 1. Authentication Architecture (Supabase Auth)
- Managed by Supabase Auth with asymmetric JWT tokens (access token and refresh token).
- Encrypted password hashes, recovery salts, and credentials reside in the protected internal schema `auth.users`.
- Passwords, hashes, and secrets are NEVER exposed to client applications or logged in audit trails.

### The `auth.users` $\to$ `public.profiles` Relationship
1. **Schema Boundary**: Client applications cannot query or join `auth.users` directly. All application data links to `public.profiles`.
2. **Synchronization Trigger (`on_auth_user_created`)**:
   - Executes `SECURITY DEFINER` function `handle_new_user()` immediately after a row is inserted into `auth.users`.
   - Maps `auth.users.id` $\to$ `public.profiles.id` and `public.profiles.auth_user_id` (1:1 relationship).
   - Extracts metadata: `full_name`, `phone`, and assigns `role`.
3. **Privilege Escalation Defense**:
   - Public self-registration assigns the default role `'CUSTOMER'`.
   - If an attacker intercepts the registration network request and passes `{ "role": "ADMIN" }` in user metadata, the database trigger intercepts and clamps the role to `'CUSTOMER'`.
   - The `'ADMIN'` role can only be assigned via database administrative functions or verified admin invitations.
4. **Lifecycle Hooks**:
   - `ON DELETE CASCADE`: When an auth user is removed, the associated profile is safely removed.
   - `on_auth_user_updated`: Synchronizes email changes automatically from `auth.users` to `public.profiles`.

## 2. Session Management & Persistence
- Mobile (Flutter) utilizes `supabase_flutter` with secure enclave/keystore persistence.
- Web Admin (React) utilizes Supabase local storage token persistence with auto-refresh on token expiry.
- Logout terminates active sessions and clears local token stores.

## 3. Password Reset Flow
- Dispatches single-use time-limited reset links directly via Supabase Auth email service.
- The reset token verifies user ownership without exposing the current or old password.

## 4. Row Level Security (RLS) Policy Implementation (Phase 4)
Row Level Security is enabled on all tables (`profiles`, `services`, `service_requests`, `request_status_history`, `audit_logs`).

### Policy Details

#### `service_requests`
1. **`requests_select_policy`**:
   ```sql
   FOR SELECT USING (
       customer_id = auth.uid()
       OR agent_id = auth.uid()
       OR public.is_admin()
   );
   ```
2. **`requests_customer_insert`**:
   ```sql
   FOR INSERT WITH CHECK (
       (customer_id = auth.uid() AND status = 'CREATED' AND agent_id IS NULL)
       OR public.is_admin()
   );
   ```
3. **`requests_update_policy`**:
   ```sql
   FOR UPDATE USING (
       customer_id = auth.uid()
       OR agent_id = auth.uid()
       OR public.is_admin()
   )
   WITH CHECK (
       public.is_admin()
       OR (customer_id = auth.uid() AND status = 'CANCELLED')
       OR (agent_id = auth.uid() AND customer_id = ... AND agent_id = ...)
   );
   ```

#### `profiles`
- SELECT: Users see their own profile, Admins see all, Agents see assigned customer contacts.
- UPDATE: Users can update their own contact info; self-alteration of `role` is strictly rejected by `WITH CHECK (role = (SELECT role FROM profiles WHERE id = auth.uid()))`.

#### `audit_logs`
- SELECT: Only callers satisfying `public.is_admin()` can query audit logs. Customers and Agents receive zero records.

### Mandatory Authorization Verification Matrix
| Test Scenario | Actor | Target Resource | Expected | Actual | RLS Policy Evaluated |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Customer A $\to$ Customer A Request | Customer A | REQ-001 (Customer A) | ALLOWED | ALLOWED | `requests_select_policy: customer_id = auth.uid()` |
| Customer A $\to$ Customer B Request | Customer A | REQ-002 (Customer B) | DENIED | DENIED | `requests_select_policy: customer_id = auth.uid()` |
| Agent A $\to$ Agent A Request | Agent A | REQ-001 (Agent A) | ALLOWED | ALLOWED | `requests_select_policy: agent_id = auth.uid()` |
| Agent A $\to$ Agent B Request | Agent A | REQ-002 (Agent B) | DENIED | DENIED | `requests_select_policy: agent_id = auth.uid()` |
| Customer $\to$ Assign Agent Operation | Customer | Agent Dispatch | DENIED | DENIED | `requests_update_policy: WITH CHECK (is_admin())` |
| Customer $\to$ Audit Logs Read | Customer | `audit_logs` table | DENIED | DENIED | `audit_logs_admin_select: USING (is_admin())` |
| Admin $\to$ All Operational Data | Admin | All Requests & Logs | ALLOWED | ALLOWED | `public.is_admin() = TRUE` |

## 5. Audit Logging
- Logs actions: `LOGIN_SUCCESS`, `REQUEST_CREATED`, `REQUEST_ASSIGNED`, `REQUEST_UPDATED`, `AUTHORIZATION_FAILED`, `DATABASE_ERROR`.
- Strict scrubbing of sensitive fields (passwords, tokens, API keys).
