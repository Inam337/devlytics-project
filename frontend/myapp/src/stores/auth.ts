import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  acceptInvitation as acceptInvitationRequest,
  login as loginRequest,
  logout as logoutRequest,
  me as meRequest,
  register as registerRequest,
} from '@/services/auth';
import { clearTokens, getRefreshToken, setTokens } from '@/libs/auth-tokens';
import type {
  AcceptInvitationRequest,
  AuthOrganization,
  AuthRole,
  AuthSession,
  AuthUser,
  LoginRequest,
  RegisterRequest,
} from '@/models';

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  organization: AuthOrganization | null;
  role: AuthRole | null;
  permissions: string[];
  hasHydrated: boolean;
  login: (payload: LoginRequest) => Promise<{ success: boolean; error?: string }>;
  register: (payload: RegisterRequest) => Promise<{ success: boolean; error?: string }>;
  acceptInvitation: (payload: AcceptInvitationRequest) => Promise<{ success: boolean; error?: string }>;
  /** Validates/refreshes the persisted session against GET /auth/me on app boot. */
  bootstrap: () => Promise<void>;
  logout: () => Promise<void>;
  setSession: (session: AuthSession) => void;
  setHasHydrated: (value: boolean) => void;
}

const initialState = {
  token: null,
  refreshToken: null,
  user: null,
  organization: null,
  role: null,
  permissions: [] as string[],
  hasHydrated: false,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      ...initialState,
      setHasHydrated: (value: boolean) => set({ hasHydrated: value }),
      setSession: (session: AuthSession) => {
        setTokens(session.accessToken, session.refreshToken);
        set({
          token: session.accessToken,
          refreshToken: session.refreshToken,
          user: session.user,
          organization: session.organization,
          role: session.role,
          permissions: session.permissions,
        });
      },
      login: async (payload: LoginRequest) => {
        const result = await loginRequest(payload);

        // NOTE: this project's tsconfig has strictNullChecks off, which breaks
        // discriminated-union narrowing on `!result.ok` — check `=== true` first
        // instead (same workaround as Profile.tsx's change-password flow).
        if (result.ok === true) {
          get().setSession(result.data);

          return { success: true };
        }

        return { success: false, error: result.error };
      },
      register: async (payload: RegisterRequest) => {
        const result = await registerRequest(payload);

        if (result.ok === true) {
          get().setSession(result.data);

          return { success: true };
        }

        return { success: false, error: result.error };
      },
      acceptInvitation: async (payload: AcceptInvitationRequest) => {
        const result = await acceptInvitationRequest(payload);

        if (result.ok === true) {
          get().setSession(result.data);

          return { success: true };
        }

        return { success: false, error: result.error };
      },
      bootstrap: async () => {
        if (!get().token) {
          return;
        }

        const result = await meRequest();

        if (result.ok === true) {
          set({
            user: result.data.user,
            organization: result.data.organization,
            role: result.data.role,
            permissions: result.data.permissions,
          });

          return;
        }

        clearTokens();
        set({ ...initialState, hasHydrated: true });
      },
      logout: async () => {
        const refreshToken = get().refreshToken ?? getRefreshToken();

        try {
          await logoutRequest(refreshToken);
        } catch {
          // Best-effort: local logout must succeed even if the server call fails.
        }

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
        organization: state.organization,
        role: state.role,
        permissions: state.permissions,
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
