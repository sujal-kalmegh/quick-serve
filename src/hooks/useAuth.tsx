import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { authService, AuthSession } from '../services/authService';
import { UserRole } from '../types/database';

interface AuthContextType {
  session: AuthSession | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name: string, phone?: string, role?: UserRole) => Promise<string>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<string>;
  switchTestAccount: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Session persistence on mount
  useEffect(() => {
    let mounted = true;
    authService.getStoredSession().then((stored) => {
      if (mounted) {
        setSession(stored);
        setLoading(false);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  const signIn = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const { session: newSession } = await authService.signIn(email, pass);
      setSession(newSession);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string, 
    pass: string, 
    name: string, 
    phone?: string, 
    role?: UserRole
  ): Promise<string> => {
    setLoading(true);
    try {
      const res = await authService.signUp(email, pass, name, phone, role);
      // Auto sign in with generated profile
      setSession({
        user: {
          id: res.profile.id,
          email: res.profile.email,
          role: res.profile.role,
          fullName: res.profile.full_name,
        },
        accessToken: `jwt-${res.profile.id}`,
        expiresAt: Date.now() + 3600000 * 24,
      });
      return res.message;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await authService.signOut();
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    const res = await authService.resetPassword(email);
    return res.message;
  };

  const switchTestAccount = async (role: UserRole) => {
    setLoading(true);
    try {
      const account = authService.getAvailableTestAccounts().find((a) => a.role === role);
      if (account) {
        const { session: newSession } = await authService.signIn(account.email, account.pass);
        setSession(newSession);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        switchTestAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
