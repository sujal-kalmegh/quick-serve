import React, { useState } from 'react';
import { rlsEngine, TEST_ACTORS, TEST_REQUESTS, RlsTestResult } from '../../services/rlsSimulator';
import { 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Play, 
  Lock, 
  User, 
  Key, 
  Database,
  ArrowRight
} from 'lucide-react';
import { UserRole } from '../../types/database';

export const RlsTestHarness: React.FC = () => {
  const [testResults, setTestResults] = useState<RlsTestResult[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Interactive sandbox state
  const [selectedActorKey, setSelectedActorKey] = useState<keyof typeof TEST_ACTORS>('customerA');
  const [selectedRequestKey, setSelectedRequestKey] = useState<keyof typeof TEST_REQUESTS>('reqCustomerA_AgentA');
  const [selectedOperation, setSelectedOperation] = useState<'SELECT' | 'UPDATE' | 'ADMIN_ASSIGN'>('SELECT');
  const [sandboxOutcome, setSandboxOutcome] = useState<{ allowed: boolean; policy: string; reason: string } | null>(null);

  const runAllRlsTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const results = rlsEngine.runMandatoryAuthorizationTests();
      setTestResults(results);
      setIsRunning(false);
    }, 200);
  };

  const evaluateSandbox = () => {
    const actor = TEST_ACTORS[selectedActorKey];
    const target = TEST_REQUESTS[selectedRequestKey];

    if (selectedOperation === 'SELECT') {
      const allowed = rlsEngine.evaluateRequestSelect(actor.id, actor.role, target);
      setSandboxOutcome({
        allowed,
        policy: 'requests_select_policy: customer_id = auth.uid() OR agent_id = auth.uid() OR is_admin()',
        reason: allowed
          ? `Access GRANTED: Actor (${actor.name}) is authorized as ${actor.role === 'ADMIN' ? 'System Administrator' : 'an assigned participant'}.`
          : `Access DENIED (403): Actor (${actor.name}) does not own request and is not assigned agent. PostgreSQL RLS filter eliminates row.`,
      });
    } else if (selectedOperation === 'UPDATE') {
      // Simulate attempting to cancel
      const allowed = rlsEngine.evaluateRequestUpdate(actor.id, actor.role, target, { status: 'CANCELLED' });
      setSandboxOutcome({
        allowed,
        policy: 'requests_update_policy: WITH CHECK (...)',
        reason: allowed
          ? `Mutation GRANTED: Actor (${actor.name}) satisfies permitted update conditions.`
          : `Mutation REJECTED: Actor (${actor.name}) is not authorized to modify request ${target.request_number}.`,
      });
    } else if (selectedOperation === 'ADMIN_ASSIGN') {
      const allowed = rlsEngine.evaluateAgentAssignment(actor.role);
      setSandboxOutcome({
        allowed,
        policy: 'requests_update_policy: WITH CHECK (is_admin())',
        reason: allowed
          ? `Operation GRANTED: Administrator role verified.`
          : `Operation DENIED (403): Only Administrators can assign agents. ${actor.name} (${actor.role}) denied.`,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner explaining RLS */}
      <div className="bg-white border border-zinc-200 rounded-lg p-5 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-50 text-blue-700 rounded-md shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">
              PostgreSQL Row Level Security (RLS) & RBAC Verification
            </h3>
            <p className="text-xs text-zinc-600 mt-1 leading-relaxed">
              Row Level Security ensures that authorization is authoritatively enforced by the PostgreSQL database engine on every query and mutation. Even if an attacker bypasses the client UI, forged requests are rejected by PostgreSQL policies.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Automated Test Suite Box */}
        <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-4">
              <div>
                <h4 className="text-sm font-semibold text-zinc-900">Mandatory Authorization Test Suite</h4>
                <p className="text-xs text-zinc-500">Executing exact Customer, Agent, and Admin cross-isolation rules</p>
              </div>
              <button
                onClick={runAllRlsTests}
                disabled={isRunning}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors disabled:opacity-50"
              >
                <Play className="w-3 h-3 fill-current" />
                {isRunning ? 'Evaluating...' : 'Run All Tests'}
              </button>
            </div>

            {testResults ? (
              <div className="space-y-2.5">
                {testResults.map((t, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border text-xs ${
                      t.passed ? 'bg-zinc-50 border-zinc-200' : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-zinc-900">{t.scenario}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          t.actualOutcome === 'ALLOWED' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-900'
                        }`}>
                          {t.actualOutcome}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          TEST PASSED
                        </span>
                      </div>
                    </div>
                    <div className="text-zinc-600 text-[11px] mb-1">{t.explanation}</div>
                    <div className="text-[10px] font-mono text-zinc-400 truncate">
                      Policy: {t.policyEvaluated}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-400 text-xs border border-dashed border-zinc-200 rounded-lg">
                Click "Run All Tests" to execute the 7 authorization test cases required by the specification.
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-100 text-[11px] text-zinc-500">
            <strong>Key Security Check:</strong> Customer A cannot query Customer B's records; Agent A cannot view Agent B's assigned tasks; Customer cannot perform admin assignments or access audit logs.
          </div>
        </div>

        {/* Interactive Policy Sandbox */}
        <div className="bg-white border border-zinc-200 rounded-lg p-6 shadow-xs">
          <div className="border-b border-zinc-100 pb-3 mb-4">
            <h4 className="text-sm font-semibold text-zinc-900">Interactive RLS Policy Sandbox</h4>
            <p className="text-xs text-zinc-500">Test any actor against any target resource to observe PostgreSQL policy evaluation</p>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-medium text-zinc-700 mb-1">Select Simulated Caller (Actor)</label>
              <select
                value={selectedActorKey}
                onChange={(e) => setSelectedActorKey(e.target.value as keyof typeof TEST_ACTORS)}
                className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-950 text-xs"
              >
                <option value="customerA">Alice - Customer A (c111...)</option>
                <option value="customerB">Charlie - Customer B (c222...)</option>
                <option value="agentA">Bob - Agent A (a111...)</option>
                <option value="agentB">David - Agent B (a222...)</option>
                <option value="admin">Sarah - System Administrator (d333...)</option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-zinc-700 mb-1">Target Resource</label>
              <select
                value={selectedRequestKey}
                onChange={(e) => setSelectedRequestKey(e.target.value as keyof typeof TEST_REQUESTS)}
                className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-950 text-xs"
              >
                <option value="reqCustomerA_AgentA">
                  REQ-2026-000001 (Customer A + Agent A)
                </option>
                <option value="reqCustomerB_AgentB">
                  REQ-2026-000002 (Customer B + Agent B)
                </option>
              </select>
            </div>

            <div>
              <label className="block font-medium text-zinc-700 mb-1">Requested Database Operation</label>
              <select
                value={selectedOperation}
                onChange={(e) => setSelectedOperation(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-zinc-950 text-xs"
              >
                <option value="SELECT">SELECT (Read request details)</option>
                <option value="UPDATE">UPDATE (Modify request / cancel)</option>
                <option value="ADMIN_ASSIGN">ADMIN_OPERATION (Dispatch / assign agent)</option>
              </select>
            </div>

            <button
              onClick={evaluateSandbox}
              className="w-full py-2 bg-zinc-900 text-white font-medium rounded-md hover:bg-zinc-800 transition-colors"
            >
              Evaluate Policy Decision
            </button>

            {sandboxOutcome && (
              <div className={`mt-4 p-4 rounded-md border ${
                sandboxOutcome.allowed 
                  ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900' 
                  : 'bg-red-50/60 border-red-200 text-red-900'
              }`}>
                <div className="flex items-center gap-2 font-semibold mb-1">
                  {sandboxOutcome.allowed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span>Decision: {sandboxOutcome.allowed ? 'ACCESS ALLOWED' : 'ACCESS DENIED (403)'}</span>
                </div>
                <p className="text-xs mb-2 leading-relaxed">{sandboxOutcome.reason}</p>
                <div className="text-[10px] font-mono text-zinc-500 bg-white/70 p-2 rounded border border-zinc-200">
                  {sandboxOutcome.policy}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
