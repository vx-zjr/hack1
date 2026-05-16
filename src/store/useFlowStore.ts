import { create } from 'zustand';

export type FlowPhase = 'loading' | 'welcome' | 'authAnimation' | 'securityInject' | 'tty' | 'dashboard';

type SessionMeta = {
  id: string;
  operator: string;
  startedAt: string;
};

type PendingAuthResult = {
  ok: boolean;
  field?: 'username' | 'password';
  message?: string;
};

type FlowState = {
  phase: FlowPhase;
  authError: string | null;
  authErrorField?: 'username' | 'password';
  pendingAuth: PendingAuthResult | null;
  session: SessionMeta;
  setPhase: (phase: FlowPhase) => void;
  setAuthError: (error: string | null, field?: 'username' | 'password') => void;
  setPendingAuth: (result: PendingAuthResult | null) => void;
  resetSession: (operator: string) => void;
};

function makeSession(operator = 'guest'): SessionMeta {
  return {
    id: `sess_${Math.random().toString(16).slice(2, 6).toUpperCase()}`,
    operator,
    startedAt: new Date().toISOString(),
  };
}

export const useFlowStore = create<FlowState>((set) => ({
  phase: 'loading',
  authError: null,
  authErrorField: undefined,
  pendingAuth: null,
  session: makeSession(),
  setPhase: (phase) => set({ phase }),
  setAuthError: (authError, authErrorField) => set({ authError, authErrorField }),
  setPendingAuth: (pendingAuth) => set({ pendingAuth }),
  resetSession: (operator) => set({ session: makeSession(operator), authError: null, authErrorField: undefined }),
}));
