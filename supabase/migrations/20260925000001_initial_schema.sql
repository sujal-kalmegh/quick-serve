-- ====================================================================
-- QuickServe Database Schema - Phase 2 Initial Migration
-- Target: Supabase / PostgreSQL 15+
-- ====================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Custom Enumerations
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('CUSTOMER', 'AGENT', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE request_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE request_status AS ENUM (
        'CREATED',
        'ASSIGNED',
        'ACCEPTED',
        'IN_PROGRESS',
        'COMPLETED',
        'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE audit_action AS ENUM (
        'LOGIN_SUCCESS',
        'REQUEST_CREATED',
        'REQUEST_ASSIGNED',
        'REQUEST_UPDATED',
        'AUTHORIZATION_FAILED',
        'DATABASE_ERROR'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Automatic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- TABLE: profiles
-- Stores user identity and operational roles.
-- 1:1 foreign relationship to Supabase auth.users.
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL CHECK (char_length(trim(full_name)) >= 2),
    email VARCHAR(255) NOT NULL UNIQUE CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
    phone VARCHAR(30) CHECK (phone IS NULL OR phone ~* '^\+?[0-9\s\-\(\)]{7,25}$'),
    role user_role NOT NULL DEFAULT 'CUSTOMER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for profiles updated_at
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_auth_user_id ON public.profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ====================================================================
-- TABLE: services
-- Master catalog of supported service offerings.
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE CHECK (char_length(trim(name)) >= 2),
    description TEXT NOT NULL CHECK (char_length(trim(description)) >= 10),
    icon VARCHAR(50) NOT NULL DEFAULT 'wrench',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for services lookup
CREATE INDEX IF NOT EXISTS idx_services_is_active ON public.services(is_active);

-- ====================================================================
-- TABLE: service_requests
-- Core transactional entity capturing customer service bookings.
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.service_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(30) NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    agent_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
    description TEXT NOT NULL CHECK (char_length(trim(description)) >= 10),
    preferred_date DATE NOT NULL,
    preferred_time VARCHAR(20) NOT NULL CHECK (char_length(trim(preferred_time)) >= 3),
    address TEXT NOT NULL CHECK (char_length(trim(address)) >= 5),
    priority request_priority NOT NULL DEFAULT 'MEDIUM',
    status request_status NOT NULL DEFAULT 'CREATED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_agent_assignment CHECK (
        (status = 'CREATED' AND agent_id IS NULL) OR
        (status <> 'CREATED')
    )
);

-- Trigger for service_requests updated_at
DROP TRIGGER IF EXISTS trg_service_requests_updated_at ON public.service_requests;
CREATE TRIGGER trg_service_requests_updated_at
    BEFORE UPDATE ON public.service_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Indexes for query path optimization
CREATE INDEX IF NOT EXISTS idx_requests_customer_id ON public.service_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_requests_agent_id ON public.service_requests(agent_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.service_requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_service_id ON public.service_requests(service_id);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON public.service_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_requests_number ON public.service_requests(request_number);

-- ====================================================================
-- TABLE: request_status_history
-- Immutable audit log of all request lifecycle transitions.
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.request_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.service_requests(id) ON DELETE CASCADE,
    old_status request_status,
    new_status request_status NOT NULL,
    changed_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for chronological history reconstruction
CREATE INDEX IF NOT EXISTS idx_history_request_id ON public.request_status_history(request_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_history_changed_by ON public.request_status_history(changed_by);

-- ====================================================================
-- TABLE: audit_logs
-- Immutable security event trail for access monitoring and forensics.
-- NEVER stores passwords, JWT tokens, or API secrets.
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action audit_action NOT NULL,
    entity_type VARCHAR(50) NOT NULL CHECK (char_length(trim(entity_type)) > 0),
    entity_id VARCHAR(100),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit query filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- ====================================================================
-- SEED DATA: Required Core Services
-- ====================================================================
INSERT INTO public.services (name, description, icon, is_active)
VALUES
    ('AC Servicing', 'Comprehensive air conditioning inspection, deep filter cleansing, refrigerant check, and performance tuning.', 'wind', TRUE),
    ('Plumbing', 'Diagnostic leak repair, pipe fixtures, unclogging, water heater maintenance, and sanitary installations.', 'droplet', TRUE),
    ('Electrical', 'Circuit inspection, panel maintenance, appliance wiring, lighting setup, and electrical fault troubleshooting.', 'zap', TRUE),
    ('Cleaning', 'Deep home and office sanitization, vacuuming, floor polishing, and post-maintenance cleanup.', 'sparkles', TRUE)
ON CONFLICT (name) DO UPDATE 
SET 
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    is_active = EXCLUDED.is_active;
