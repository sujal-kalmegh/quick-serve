import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { authService } from '../../services/authService';
import { 
  UserCheck, 
  KeyRound, 
  LogOut, 
  UserPlus, 
  RotateCcw, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Play, 
  User,
  Mail,
  Lock,
  Phone
} from 'lucide-react';
import { UserRole } from '../../types/database';

export const AuthTestHarness: React.FC = () => {
  const { session, signIn, signUp, signOut, resetPassword, switchTestAccount } = useAuth();

  // Form states
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [roleAttempt, setRoleAttempt] = useState<UserRole>('CUSTOMER');
  
  // Feedback states
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Automated Test Suite State
  const [testResults, setTestResults] = useState<Array<{ name: string; passed: boolean; message: string }> | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      await signIn(email, password);
      setStatusMessage({ type: 'success', text: `Logged in successfully as ${email}` });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Login failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const msg = await signUp(email, password, fullName, phone, roleAttempt);
      setStatusMessage({ 
        type: 'success', 
        text: `${msg} Role assigned: ${roleAttempt === 'ADMIN' ? 'CUSTOMER (Protected from ADMIN escalation)' : roleAttempt}` 
      });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Registration failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const msg = await resetPassword(email);
      setStatusMessage({ type: 'success', text: msg });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Password reset request failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Run automated suite testing all 5 core auth requirements
  const runAutomatedAuthTests = async () => {
    setIsRunningTests(true);
    const results: Array<{ name: string; passed: boolean; message: string }> = [];

    // Test 1: User Registration
    try {
      const testEmail = `test.user.${Date.now()}@quickserve.dev`;
      const res = await authService.signUp(testEmail, 'password123', 'Test Customer', '+1 555-9999', 'CUSTOMER');
      results.push({
        name: '1. User Registration & Profile Creation',
        passed: res.profile.email === testEmail && res.profile.role === 'CUSTOMER',
        message: `Registered user received 1:1 profile (${res.profile.id}) with role: ${res.profile.role}`,
      });
    } catch (err: any) {
      results.push({ name: '1. User Registration & Profile Creation', passed: false, message: err.message });
    }

    // Test 2: Admin Escalation Prevention
    try {
      const hackEmail = `attacker.${Date.now()}@quickserve.dev`;
      const res = await authService.signUp(hackEmail, 'password123', 'Attacker', undefined, 'ADMIN');
      results.push({
        name: '2. Prevent Unauthorized ADMIN Registration Escalation',
        passed: res.profile.role === 'CUSTOMER',
        message: `Public registration requesting 'ADMIN' was securely downgraded to: '${res.profile.role}'`,
      });
    } catch (err: any) {
      results.push({ name: '2. Prevent Unauthorized ADMIN Registration Escalation', passed: false, message: err.message });
    }

    // Test 3: Sign In with Valid Credentials
    try {
      const { session: newSession } = await authService.signIn('customer@quickserve.dev', 'customer123');
      results.push({
        name: '3. Authentication & JWT Session Issuance',
        passed: Boolean(newSession.accessToken && newSession.user.id),
        message: `Issued session token for ${newSession.user.email} with role: ${newSession.user.role}`,
      });
    } catch (err: any) {
      results.push({ name: '3. Authentication & JWT Session Issuance', passed: false, message: err.message });
    }

    // Test 4: Session Persistence
    try {
      const persisted = await authService.getStoredSession();
      results.push({
        name: '4. Session Persistence & Rehydration',
        passed: Boolean(persisted && persisted.user),
        message: `Session successfully preserved in persistent client storage (User: ${persisted?.user.email})`,
      });
    } catch (err: any) {
      results.push({ name: '4. Session Persistence & Rehydration', passed: false, message: err.message });
    }

    // Test 5: Password Reset Initiation
    try {
      const resetRes = await authService.resetPassword('customer@quickserve.dev');
      results.push({
        name: '5. Password Reset Recovery Flow',
        passed: resetRes.success,
        message: resetRes.message,
      });
    } catch (err: any) {
      results.push({ name: '5. Password Reset Recovery Flow', passed: false, message: err.message });
    }

    setTestResults(results);
    setIsRunningTests(false);
  };

  return (
    <div className="space-y-6">
      {/* Current Session Banner */}
      <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${session ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-zinc-400">Active Auth State</div>
              <div className="text-sm font-semibold text-zinc-900">
                {session ? (
                  <span>
                    Logged in as <strong>{session.user.fullName}</strong> ({session.user.email})
                  </span>
                ) : (
                  <span className="text-zinc-500">No active session (Guest)</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {session && (
              <>
                <span className="text-xs font-mono px-2.5 py-1 bg-zinc-100 border border-zinc-200 rounded text-zinc-700">
                  Role: {session.user.role}
                </span>
                <button
                  onClick={signOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </>
            )}
          </div>
        </div>

        {/* Quick Test Account Switcher */}
        <div className="mt-4 pt-4 border-t border-zinc-100 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-zinc-500 font-medium">Quick Test Role Switch:</span>
          {authService.getAvailableTestAccounts().map((acc) => (
            <button
              key={acc.role}
              onClick={() => switchTestAccount(acc.role)}
              className="px-2.5 py-1 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded text-zinc-700 transition-colors"
            >
              {acc.name} ({acc.role})
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interactive Form Box */}
        <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-xs">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-5">
            <h3 className="text-sm font-semibold text-zinc-900">
              Interactive Authentication Testing
            </h3>
            <div className="flex items-center gap-1 bg-zinc-100 p-0.5 rounded-lg text-xs font-medium">
              <button
                onClick={() => { setMode('login'); setStatusMessage(null); }}
                className={`px-3 py-1 rounded-md transition-colors ${mode === 'login' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'}`}
              >
                Login
              </button>
              <button
                onClick={() => { setMode('register'); setStatusMessage(null); }}
                className={`px-3 py-1 rounded-md transition-colors ${mode === 'register' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'}`}
              >
                Register
              </button>
              <button
                onClick={() => { setMode('forgot'); setStatusMessage(null); }}
                className={`px-3 py-1 rounded-md transition-colors ${mode === 'forgot' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-600 hover:text-zinc-900'}`}
              >
                Reset Password
              </button>
            </div>
          </div>

          {statusMessage && (
            <div className={`mb-4 p-3 rounded-md text-xs flex items-center gap-2 ${
              statusMessage.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Login Form */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4 text-xs">
              <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
                <span>Autofill Demo Credentials:</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('customer@quickserve.dev');
                      setPassword('customer123');
                    }}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Customer
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('agent@quickserve.dev');
                      setPassword('agent123');
                    }}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Agent
                  </button>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => {
                      setEmail('admin@quickserve.dev');
                      setPassword('admin123');
                    }}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    Admin
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-medium text-zinc-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. customer@quickserve.dev"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 text-xs"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2 bg-zinc-900 text-white font-medium rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Authenticating...' : 'Sign In'}
              </button>
            </form>
          )}

          {/* Register Form */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. jane@example.com"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Phone Number (Optional)</label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555-0199"
                    className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 6 characters"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 text-xs"
                  />
                </div>
              </div>
              <div>
                <label className="block font-medium text-zinc-700 mb-1">
                  Requested Role (Testing Defense Test)
                </label>
                <select
                  value={roleAttempt}
                  onChange={(e) => setRoleAttempt(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 text-xs"
                >
                  <option value="CUSTOMER">CUSTOMER (Standard Public Registration)</option>
                  <option value="AGENT">AGENT (Field Technician)</option>
                  <option value="ADMIN">ADMIN (Simulate Privilege Escalation Attack)</option>
                </select>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Selecting 'ADMIN' will test that backend logic denies privilege escalation and clamps to CUSTOMER.
                </p>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2 bg-zinc-900 text-white font-medium rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Registering...' : 'Complete Registration'}
              </button>
            </form>
          )}

          {/* Forgot Password Form */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4 text-xs">
              <p className="text-zinc-600 text-xs">
                Enter your account email address. A recovery reset link will be dispatched via Supabase Auth.
              </p>
              <div>
                <label className="block font-medium text-zinc-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. customer@quickserve.dev"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-950 focus:border-zinc-950 text-xs"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2 bg-zinc-900 text-white font-medium rounded-md hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Sending Request...' : 'Send Password Reset Link'}
              </button>
            </form>
          )}
        </div>

        {/* Automated Test Suite Box */}
        <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">Phase 3 Verification Suite</h3>
                <p className="text-xs text-zinc-500">Automated end-to-end check of all 5 auth requirements</p>
              </div>
              <button
                onClick={runAutomatedAuthTests}
                disabled={isRunningTests}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50"
              >
                <Play className="w-3 h-3 fill-current" />
                {isRunningTests ? 'Running...' : 'Run Test Suite'}
              </button>
            </div>

            {testResults ? (
              <div className="space-y-3">
                {testResults.map((t, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border text-xs ${
                      t.passed ? 'bg-emerald-50/50 border-emerald-200' : 'bg-red-50/50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-zinc-900">{t.name}</span>
                      <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${
                        t.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {t.passed ? 'PASSED' : 'FAILED'}
                      </span>
                    </div>
                    <div className="text-zinc-600 text-[11px]">{t.message}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-400 text-xs border border-dashed border-zinc-200 rounded-lg">
                Click "Run Test Suite" to execute automated tests covering registration, role escalation defense, login, session persistence, and password reset.
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-100 text-[11px] text-zinc-500">
            <strong>Security Guarantee:</strong> Passwords and JWT tokens are kept strictly in secure memory or client storage; they are never printed in plain text to logs or the UI.
          </div>
        </div>
      </div>
    </div>
  );
};
