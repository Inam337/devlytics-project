import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  login as loginRequest,
  register as registerRequest,
  refreshAccessToken as refreshRequest,
} from '@/services/auth';
import { clearTokens, getRefreshToken, setTokens } from '@/libs/auth-tokens';
import type {
  AuthLoginResponse,
  AuthResult,
  AuthUser,
  RegisterRequest,
} from '@/models';

export interface AuthSession {
  token: string;
  refreshToken: string | null;
  user: AuthUser | null;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  hasHydrated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (payload: RegisterRequest) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  setSession: (session: AuthSession) => void;
  refreshSession: () => Promise<boolean>;
  setHasHydrated: (value: boolean) => void;
}

const initialState = {
  token: null,
  refreshToken: null,
  user: null,
  hasHydrated: false,
};
const isAuthFailure = <T>(
  result: AuthResult<T>,
): result is Extract<AuthResult<T>, { ok: false }> => !result.ok;
const authFailure = <T>(result: Extract<AuthResult<T>, { ok: false }>) => ({
  success: false as const,
  error: result.error,
});
const applyAuthResponse = (response: AuthLoginResponse): AuthSession => ({
  token: response.token,
  refreshToken: response.refreshToken ?? null,
  user: response.user,
});

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,
      setHasHydrated: (value: boolean) => set({ hasHydrated: value }),
      setSession: (session: AuthSession) => {
        setTokens(session.token, session.refreshToken);
        set({
          token: session.token,
          refreshToken: session.refreshToken,
          user: session.user,
        });
      },
      login: async (email: string, password: string) => {
        const result = await loginRequest(email, password);

        if (isAuthFailure(result)) {
          return authFailure(result);
        }

        const session = applyAuthResponse(result.data);

        get().setSession(session);

        return { success: true };
      },
      register: async (payload: RegisterRequest) => {
        const result = await registerRequest(payload);

        if (isAuthFailure(result)) {
          return authFailure(result);
        }

        const session = applyAuthResponse(result.data);

        get().setSession(session);

        return { success: true };
      },
      refreshSession: async () => {
        const refresh = get().refreshToken ?? getRefreshToken();

        if (!refresh) {
          return false;
        }

        const result = await refreshRequest(refresh);

        if (!result.ok) {
          return false;
        }

        get().setSession({
          token: result.data.token,
          refreshToken: result.data.refreshToken,
          user: get().user,
        });

        return true;
      },
      logout: () => {
        clearTokens();
        set({ ...initialState, hasHydrated: true });
      },
    }),
    {
      name: 'store-auth',
      partialize: state => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('[auth] Failed to rehydrate session:', error);

          return;
        }

        if (state?.token) {
          setTokens(state.token, state.refreshToken);
        }
      },
    },
  ),
);

/** Called only after useAuthStore exists (avoid TDZ during persist init). */
const finishAuthHydration = (): void => {
  useAuthStore.setState({ hasHydrated: true });
};

useAuthStore.persist.onFinishHydration(finishAuthHydration);

if (useAuthStore.persist.hasHydrated()) {
  finishAuthHydration();
}

export const selectIsAuthenticated = (state: AuthState): boolean =>
  state.token != null;
