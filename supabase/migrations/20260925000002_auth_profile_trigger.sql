-- ====================================================================
-- QuickServe Database Migration - Phase 3: Auth to Profiles Sync Trigger
-- Target: Supabase / PostgreSQL 15+
-- ====================================================================

-- Function to handle new user registration from Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    assigned_role public.user_role;
    raw_role text;
BEGIN
    -- Extract role from metadata if present, default to CUSTOMER
    raw_role := NEW.raw_user_meta_data->>'role';
    
    -- Security Rule: Never allow self-registration to claim ADMIN role
    IF raw_role = 'ADMIN' THEN
        assigned_role := 'CUSTOMER'::public.user_role;
    ELSIF raw_role = 'AGENT' THEN
        -- Allow AGENT if explicitly designated, otherwise default to CUSTOMER
        assigned_role := 'AGENT'::public.user_role;
    ELSE
        assigned_role := 'CUSTOMER'::public.user_role;
    END IF;

    -- Insert corresponding public.profiles record
    INSERT INTO public.profiles (
        id,
        auth_user_id,
        full_name,
        email,
        phone,
        role,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        NEW.raw_user_meta_data->>'phone',
        assigned_role,
        NOW(),
        NOW()
    )
    ON CONFLICT (auth_user_id) DO UPDATE
    SET
        email = EXCLUDED.email,
        full_name = CASE 
            WHEN public.profiles.full_name IS NULL OR public.profiles.full_name = '' 
            THEN EXCLUDED.full_name 
            ELSE public.profiles.full_name 
        END,
        updated_at = NOW();

    -- Automatically log LOGIN/REGISTRATION event to audit_logs
    INSERT INTO public.audit_logs (
        actor_id,
        action,
        entity_type,
        entity_id,
        metadata
    )
    VALUES (
        NEW.id,
        'LOGIN_SUCCESS',
        'profiles',
        NEW.id::text,
        jsonb_build_object(
            'event', 'user_registered',
            'role', assigned_role,
            'email', NEW.email
        )
    );

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Record audit error if profile creation fails, without blocking authentication
        RAISE WARNING 'handle_new_user failed: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger firing on every new entry in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Trigger firing on email or metadata updates in auth.users
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles
    SET
        email = NEW.email,
        updated_at = NOW()
    WHERE auth_user_id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE OF email ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_user_update();
