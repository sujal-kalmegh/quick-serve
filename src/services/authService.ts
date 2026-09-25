import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Profile, UserRole } from '../types/database';

export interface AuthSession {
  user: {
    id: string;
    email: string;
    role: UserRole;
    fullName: string;
  };
  accessToken: string;
  expiresAt: number;
}

const LOCAL_STORAGE_SESSION_KEY = 'quickserve_auth_session';
const LOCAL_STORAGE_PROFILES_KEY = 'quickserve_mock_profiles';

// Universal safe storage wrapper for both browser and SSR / Node testing
const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof localStorage !== 'undefined') {
        return localStorage.getItem(key);
      }
    } catch {}
    return null;
  },
  setItem: (key: string, val: string): void => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, val);
      }
    } catch {}
  },
  removeItem: (key: string): void => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch {}
  },
};

const splitEmailToName = (email: string): string => {
  const prefix = email.split('@')[0] || 'User';
  return prefix.charAt(0).toUpperCase() + prefix.slice(1);
};

// Seed demo profiles for local testing if Supabase cloud is in setup phase
const getMockProfiles = (): Profile[] => {
  try {
    const raw = safeStorage.getItem(LOCAL_STORAGE_PROFILES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // Ignore storage issues
  }
  const defaultProfiles: Profile[] = [
    {
      id: 'c1111111-1111-4111-8111-111111111111',
      auth_user_id: 'c1111111-1111-4111-8111-111111111111',
      full_name: 'Alice Customer',
      email: 'customer@quickserve.dev',
      phone: '+1 555-0101',
      role: 'CUSTOMER',
      created_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'a2222222-2222-4222-8222-222222222222',
      auth_user_id: 'a2222222-2222-4222-8222-222222222222',
      full_name: 'Bob Agent',
      email: 'agent@quickserve.dev',
      phone: '+1 555-0202',
      role: 'AGENT',
      created_at: new Date(Date.now() - 86400000 * 14).toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'd3333333-3333-4333-8333-333333333333',
      auth_user_id: 'd3333333-3333-4333-8333-333333333333',
      full_name: 'Sarah Administrator',
      email: 'admin@quickserve.dev',
      phone: '+1 555-0303',
      role: 'ADMIN',
      created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];
  try {
    localStorage.setItem(LOCAL_STORAGE_PROFILES_KEY, JSON.stringify(defaultProfiles));
  } catch (e) {
    // Ignore storage issues
  }
  return defaultProfiles;
};

export const authService = {
  /**
   * User Registration
   * Default role is CUSTOMER. Even if a user attempts to send ADMIN,
   * client sanitization and the PostgreSQL trigger both restrict it.
   */
  async signUp(
    email: string, 
    password: string, 
    fullName: string, 
    phone?: string,
    roleRequested: UserRole = 'CUSTOMER'
  ): Promise<{ profile: Profile; message: string }> {
    // Defense: strictly disallow public self-registration to claim ADMIN
    const finalRole: UserRole = roleRequested === 'ADMIN' ? 'CUSTOMER' : roleRequested;

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: phone || null,
              role: finalRole,
            },
          },
        });

        if (!error && data?.user) {
          // Fetch newly created profile synced by on_auth_user_created trigger
          let profileData: Profile | null = null;
          try {
            const { data: resData, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('auth_user_id', data.user.id)
              .single();
            if (!profileError && resData) {
              profileData = resData as Profile;
            }
          } catch {
            // Table might not exist yet
          }

          const resolvedProfile: Profile = profileData || {
            id: data.user.id,
            auth_user_id: data.user.id,
            full_name: fullName,
            email,
            phone: phone || null,
            role: finalRole,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };

          // Also save in local mock store for offline/fallback continuity
          const profiles = getMockProfiles();
          if (!profiles.some(p => p.email.toLowerCase() === email.toLowerCase())) {
            profiles.push(resolvedProfile);
            safeStorage.setItem(LOCAL_STORAGE_PROFILES_KEY, JSON.stringify(profiles));
          }

          return { 
            profile: resolvedProfile, 
            message: 'Registration successful! Profile initialized.' 
          };
        } else if (error) {
          console.warn('Supabase remote signUp returned warning/error, engaging resilient local fallback:', error.message);
        }
      } catch (err: any) {
        console.warn('Supabase signUp network/rate limit exception:', err?.message || err);
      }
    }

    // Local execution engine for immediate interactive testing & demonstration
    const profiles = getMockProfiles();
    const existing = profiles.find((p) => p.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      throw new Error('A user with this email address is already registered.');
    }

    const newId = crypto.randomUUID();
    const newProfile: Profile = {
      id: newId,
      auth_user_id: newId,
      full_name: fullName,
      email,
      phone: phone || null,
      role: finalRole,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    profiles.push(newProfile);
    safeStorage.setItem(LOCAL_STORAGE_PROFILES_KEY, JSON.stringify(profiles));

    // Save session
    const session: AuthSession = {
      user: {
        id: newProfile.id,
        email: newProfile.email,
        role: newProfile.role,
        fullName: newProfile.full_name,
      },
      accessToken: `mock-jwt-${newProfile.id}`,
      expiresAt: Date.now() + 3600 * 1000 * 24,
    };
    safeStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(session));

    return { profile: newProfile, message: 'Registration successful!' };
  },

  /**
   * User Login
   */
  async signIn(email: string, password: string): Promise<{ profile: Profile; session: AuthSession }> {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const testAccounts = this.getAvailableTestAccounts();
    const matchedTestAccount = testAccounts.find(
      (a) => a.email.toLowerCase() === normalizedEmail && a.pass === password
    );

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (!error && data?.user && data?.session) {
          // Attempt to fetch profile
          let profile: Profile | null = null;
          try {
            const { data: profileData, error: profileErr } = await supabase
              .from('profiles')
              .select('*')
              .eq('auth_user_id', data.user.id)
              .single();

            if (!profileErr && profileData) {
              profile = profileData as Profile;
            }
          } catch {
            // Table might not exist yet in remote DB
          }

          // Fallback synthesized profile from Auth user metadata
          if (!profile) {
            profile = {
              id: data.user.id,
              auth_user_id: data.user.id,
              full_name: (data.user.user_metadata?.full_name as string) || splitEmailToName(data.user.email || 'User'),
              email: data.user.email || normalizedEmail,
              phone: (data.user.user_metadata?.phone as string) || null,
              role: (data.user.user_metadata?.role as UserRole) || (matchedTestAccount?.role || 'CUSTOMER'),
              created_at: data.user.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
          }

          const session: AuthSession = {
            user: {
              id: profile.id,
              email: profile.email,
              role: profile.role,
              fullName: profile.full_name,
            },
            accessToken: data.session.access_token,
            expiresAt: (data.session.expires_at || 0) * 1000,
          };

          localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(session));
          return { profile, session };
        }
      } catch (err: any) {
        console.warn('Supabase remote sign in attempt error:', err?.message || err);
      }
    }

    // If Supabase failed or user is using demo/seeded test account
    const profiles = getMockProfiles();
    let found = profiles.find((p) => p.email.toLowerCase() === normalizedEmail);

    if (!found && matchedTestAccount) {
      // Re-provision test profile if missing
      const newId = crypto.randomUUID();
      found = {
        id: newId,
        auth_user_id: newId,
        full_name: matchedTestAccount.name,
        email: matchedTestAccount.email,
        phone: null,
        role: matchedTestAccount.role,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      profiles.push(found);
      safeStorage.setItem(LOCAL_STORAGE_PROFILES_KEY, JSON.stringify(profiles));
    }

    if (found) {
      const session: AuthSession = {
        user: {
          id: found.id,
          email: found.email,
          role: found.role,
          fullName: found.full_name,
        },
        accessToken: `session-jwt-${found.id}`,
        expiresAt: Date.now() + 3600 * 1000 * 24,
      };

      safeStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(session));
      return { profile: found, session };
    }

    throw new Error('Invalid email or password. If you have not registered yet, please use the Register tab or select a test account above.');
  },

  /**
   * User Logout
   */
  async signOut(): Promise<void> {
    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.signOut();
      if (error) console.error('Supabase signOut error:', error.message);
    }
    safeStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
  },

  /**
   * Password Reset Email
   */
  async resetPassword(email: string): Promise<{ success: boolean; message: string }> {
    if (!email) throw new Error('Email address is required.');

    if (isSupabaseConfigured) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw new Error(error.message);
      return { 
        success: true, 
        message: `Password reset instructions sent to ${email}.` 
      };
    }

    // Local mode confirmation
    return {
      success: true,
      message: `Password reset instructions dispatched to ${email}. (Demo environment simulation)`,
    };
  },

  /**
   * Retrieve Current Saved Session (Session Persistence)
   */
  async getStoredSession(): Promise<AuthSession | null> {
    if (isSupabaseConfigured) {
      const { data } = await supabase.auth.getSession();
      if (data.session && data.session.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', data.session.user.id)
          .single();

        if (profile) {
          return {
            user: {
              id: profile.id,
              email: profile.email,
              role: profile.role,
              fullName: profile.full_name,
            },
            accessToken: data.session.access_token,
            expiresAt: (data.session.expires_at || 0) * 1000,
          };
        }
      }
      return null;
    }

    // Local storage persistence check
    const raw = safeStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
    if (!raw) return null;
    try {
      const session = JSON.parse(raw) as AuthSession;
      if (Date.now() > session.expiresAt) {
        safeStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
        return null;
      }
      return session;
    } catch {
      safeStorage.removeItem(LOCAL_STORAGE_SESSION_KEY);
      return null;
    }
  },

  /**
   * Quick role-switching helper for developer demonstration & testing
   */
  getAvailableTestAccounts(): Array<{ role: UserRole; name: string; email: string; pass: string }> {
    return [
      { role: 'CUSTOMER', name: 'Alice Customer', email: 'customer@quickserve.dev', pass: 'customer123' },
      { role: 'AGENT', name: 'Bob Agent', email: 'agent@quickserve.dev', pass: 'agent123' },
      { role: 'ADMIN', name: 'Sarah Administrator', email: 'admin@quickserve.dev', pass: 'admin123' },
    ];
  }
};
