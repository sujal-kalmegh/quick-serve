-- ====================================================================
-- QuickServe Database Migration: Request Number Sequence & Status Trigger
-- Target: Supabase / PostgreSQL 15+
-- ====================================================================

-- 1. Sequence for request numbers
CREATE SEQUENCE IF NOT EXISTS public.service_request_seq START 1;

-- 2. Trigger function to auto-generate request_number if not provided
CREATE OR REPLACE FUNCTION public.set_service_request_defaults()
RETURNS TRIGGER AS $$
DECLARE
    seq_val bigint;
BEGIN
    -- Auto-generate request_number in format REQ-YYYY-XXXXXX
    IF NEW.request_number IS NULL OR NEW.request_number = '' THEN
        seq_val := nextval('public.service_request_seq');
        NEW.request_number := 'REQ-' || to_char(NOW(), 'YYYY') || '-' || lpad(seq_val::text, 6, '0');
    END IF;

    -- Ensure initial status is CREATED and agent is NULL
    IF NEW.status IS NULL THEN
        NEW.status := 'CREATED'::public.request_status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_service_request_defaults ON public.service_requests;
CREATE TRIGGER trg_service_request_defaults
    BEFORE INSERT ON public.service_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.set_service_request_defaults();

-- 3. Trigger function to auto-create history entry upon request creation and status update
CREATE OR REPLACE FUNCTION public.track_service_request_history()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.request_status_history (
            request_id,
            old_status,
            new_status,
            changed_by,
            note,
            created_at
        )
        VALUES (
            NEW.id,
            NULL,
            NEW.status,
            NEW.customer_id,
            'Request created by customer',
            NOW()
        );
        
        -- Also emit audit log
        INSERT INTO public.audit_logs (
            actor_id,
            action,
            entity_type,
            entity_id,
            metadata
        )
        VALUES (
            NEW.customer_id,
            'REQUEST_CREATED',
            'service_requests',
            NEW.id::text,
            jsonb_build_object(
                'request_number', NEW.request_number,
                'service_id', NEW.service_id,
                'priority', NEW.priority
            )
        );
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.request_status_history (
            request_id,
            old_status,
            new_status,
            changed_by,
            note,
            created_at
        )
        VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            COALESCE(auth.uid(), NEW.customer_id),
            CASE 
                WHEN NEW.status = 'CANCELLED' THEN 'Request cancelled by customer'
                ELSE 'Status updated to ' || NEW.status::text
            END,
            NOW()
        );

        -- Also emit audit log
        INSERT INTO public.audit_logs (
            actor_id,
            action,
            entity_type,
            entity_id,
            metadata
        )
        VALUES (
            auth.uid(),
            'REQUEST_UPDATED',
            'service_requests',
            NEW.id::text,
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_track_service_request_history ON public.service_requests;
CREATE TRIGGER trg_track_service_request_history
    AFTER INSERT OR UPDATE ON public.service_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.track_service_request_history();
