-- ====================================================================
-- QuickServe Database Migration - Phase 4: Row Level Security (RLS) & RBAC
-- Target: Supabase / PostgreSQL 15+
-- ====================================================================

-- 1. Helper function: Check if current authenticated caller has ADMIN role
-- Marked as STABLE and SECURITY DEFINER to bypass recursion on profiles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'ADMIN'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 2. Helper function: Check if current authenticated caller has AGENT role
CREATE OR REPLACE FUNCTION public.is_agent()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'AGENT'
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ====================================================================
-- ENABLE ROW LEVEL SECURITY ACROSS ALL CORE TABLES
-- ====================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- POLICIES: profiles
-- ====================================================================

-- Users can view their own profile; Admins can view all profiles; Agents can view customer profiles for assigned requests
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT
    USING (
        id = auth.uid()
        OR public.is_admin()
        OR (
            public.is_agent() AND EXISTS (
                SELECT 1 FROM public.service_requests sr
                WHERE sr.agent_id = auth.uid()
                  AND sr.customer_id = public.profiles.id
            )
        )
    );

-- Users can only update their own profile; Users cannot self-escalate role
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE
    USING (id = auth.uid() OR public.is_admin())
    WITH CHECK (
        public.is_admin()
        OR (
            id = auth.uid()
            AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()) -- Prevents altering role
        )
    );

-- Only Admins or Auth trigger can insert/delete profiles
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all" ON public.profiles
    FOR ALL
    USING (public.is_admin());

-- ====================================================================
-- POLICIES: services
-- ====================================================================

-- Anyone authenticated can view active services
DROP POLICY IF EXISTS "services_read_active" ON public.services;
CREATE POLICY "services_read_active" ON public.services
    FOR SELECT
    USING (is_active = TRUE OR public.is_admin());

-- Only Admins can manage services catalog
DROP POLICY IF EXISTS "services_admin_manage" ON public.services;
CREATE POLICY "services_admin_manage" ON public.services
    FOR ALL
    USING (public.is_admin());

-- ====================================================================
-- POLICIES: service_requests
-- ====================================================================

-- 1. SELECT Policy
-- Customers see only own requests; Agents see only assigned requests; Admins see all
DROP POLICY IF EXISTS "requests_select_policy" ON public.service_requests;
CREATE POLICY "requests_select_policy" ON public.service_requests
    FOR SELECT
    USING (
        customer_id = auth.uid()
        OR agent_id = auth.uid()
        OR public.is_admin()
    );

-- 2. INSERT Policy
-- Customers can insert their own requests (status must start as CREATED, agent_id must be NULL)
DROP POLICY IF EXISTS "requests_customer_insert" ON public.service_requests;
CREATE POLICY "requests_customer_insert" ON public.service_requests
    FOR INSERT
    WITH CHECK (
        (customer_id = auth.uid() AND status = 'CREATED' AND agent_id IS NULL)
        OR public.is_admin()
    );

-- 3. UPDATE Policy
-- Customers: can cancel own requests if CREATED or ASSIGNED
-- Agents: can update status of requests assigned to them (cannot reassign agent or change customer)
-- Admins: can assign agents and update operational status
DROP POLICY IF EXISTS "requests_update_policy" ON public.service_requests;
CREATE POLICY "requests_update_policy" ON public.service_requests
    FOR UPDATE
    USING (
        customer_id = auth.uid()
        OR agent_id = auth.uid()
        OR public.is_admin()
    )
    WITH CHECK (
        public.is_admin()
        OR (
            -- Customer update rules: only allowed to cancel, cannot change agent or customer
            customer_id = auth.uid()
            AND customer_id = (SELECT sr.customer_id FROM public.service_requests sr WHERE sr.id = service_requests.id)
            AND agent_id IS NOT DISTINCT FROM (SELECT sr.agent_id FROM public.service_requests sr WHERE sr.id = service_requests.id)
            AND status = 'CANCELLED'
        )
        OR (
            -- Agent update rules: must be assigned agent, cannot alter customer or agent assignment
            agent_id = auth.uid()
            AND agent_id = (SELECT sr.agent_id FROM public.service_requests sr WHERE sr.id = service_requests.id)
            AND customer_id = (SELECT sr.customer_id FROM public.service_requests sr WHERE sr.id = service_requests.id)
        )
    );

-- ====================================================================
-- POLICIES: request_status_history
-- ====================================================================

-- SELECT: Customers and Agents can view history of requests they have access to; Admins see all
DROP POLICY IF EXISTS "history_select_policy" ON public.request_status_history;
CREATE POLICY "history_select_policy" ON public.request_status_history
    FOR SELECT
    USING (
        public.is_admin()
        OR EXISTS (
            SELECT 1 FROM public.service_requests sr
            WHERE sr.id = request_status_history.request_id
              AND (sr.customer_id = auth.uid() OR sr.agent_id = auth.uid())
        )
    );

-- INSERT: Authenticated users can insert history records when updating a request they participate in
DROP POLICY IF EXISTS "history_insert_policy" ON public.request_status_history;
CREATE POLICY "history_insert_policy" ON public.request_status_history
    FOR INSERT
    WITH CHECK (
        changed_by = auth.uid()
        AND (
            public.is_admin()
            OR EXISTS (
                SELECT 1 FROM public.service_requests sr
                WHERE sr.id = request_status_history.request_id
                  AND (sr.customer_id = auth.uid() OR sr.agent_id = auth.uid())
            )
        )
    );

-- ====================================================================
-- POLICIES: audit_logs
-- ====================================================================

-- Only Admins can view audit logs. Customers and Agents have zero access.
DROP POLICY IF EXISTS "audit_logs_admin_select" ON public.audit_logs;
CREATE POLICY "audit_logs_admin_select" ON public.audit_logs
    FOR SELECT
    USING (public.is_admin());

-- Insert allowed from authenticated or system security definer routines
DROP POLICY IF EXISTS "audit_logs_system_insert" ON public.audit_logs;
CREATE POLICY "audit_logs_system_insert" ON public.audit_logs
    FOR INSERT
    WITH CHECK (
        actor_id = auth.uid()
        OR actor_id IS NULL
        OR public.is_admin()
    );
