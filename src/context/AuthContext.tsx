import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types';
import type {
  PractitionerIdentity,
  WorkspaceSummary,
  WorkspaceMembership,
  WorkspaceRole,
  RegisterOwnerRequest,
} from '../types/auth';
import { authApi, tokenStore, ApiError } from '../services/api';

export interface AuthContextType {
  user: User | null;
  practitioner: PractitionerIdentity | null;
  workspace: WorkspaceSummary | null;
  membership: WorkspaceMembership | null;
  role: WorkspaceRole | null;
  clinicalAuthorized: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  login: (email: string, password: string, remember?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (req: RegisterOwnerRequest, remember?: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (updatedData: Partial<User>) => void;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapPractitionerToUser(p: PractitionerIdentity, ws?: WorkspaceSummary | null): User {
  const initials = p.initials ||
    p.name.split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || 'PT';

  return {
    id: p.id,
    name: p.name,
    email: p.email,
    title: p.title || 'Physiotherapist',
    clinicName: p.clinic_name || ws?.name || 'Private Practice',
    registrationNumber: p.registration_number || undefined,
    initials,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [practitioner, setPractitioner] = useState<PractitionerIdentity | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceSummary | null>(null);
  const [membership, setMembership] = useState<WorkspaceMembership | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Restore session on mount via refresh token
  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const storedRefreshToken = tokenStore.getRefreshToken();
      if (!storedRefreshToken) {
        if (isMounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const tokens = await authApi.refresh(storedRefreshToken);
        tokenStore.setAccessToken(tokens.accessToken, tokens.expiresIn);
        tokenStore.setRefreshToken(tokens.refreshToken);

        const me = await authApi.getMe(tokens.accessToken);
        if (isMounted) {
          setPractitioner(me.practitioner);
          setWorkspace(me.workspace);
          setMembership(me.membership);
          setUser(mapPractitionerToUser(me.practitioner, me.workspace));
          setAuthError(null);
        }
      } catch (err: any) {
        console.warn('Session restoration failed:', err.message);
        tokenStore.clear();
        if (isMounted) {
          setPractitioner(null);
          setWorkspace(null);
          setMembership(null);
          setUser(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string, remember = true): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      setAuthError(null);

      try {
        const result = await authApi.login({
          email: email.trim().toLowerCase(),
          password,
        });

        tokenStore.setAccessToken(result.tokens.accessToken, result.tokens.expiresIn);
        tokenStore.setRefreshToken(result.tokens.refreshToken, remember);

        setPractitioner(result.practitioner);
        setWorkspace(result.workspace);
        setMembership(result.membership);
        setUser(mapPractitionerToUser(result.practitioner, result.workspace));

        return { success: true };
      } catch (err: any) {
        const msg = err.message || 'Login failed. Please check your credentials.';
        setAuthError(msg);
        return { success: false, error: msg };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const register = useCallback(
    async (req: RegisterOwnerRequest, remember = true): Promise<{ success: boolean; error?: string }> => {
      setIsLoading(true);
      setAuthError(null);

      try {
        const result = await authApi.register({
          ...req,
          email: req.email.trim().toLowerCase(),
        });

        tokenStore.setAccessToken(result.tokens.accessToken, result.tokens.expiresIn);
        tokenStore.setRefreshToken(result.tokens.refreshToken, remember);

        setPractitioner(result.practitioner);
        setWorkspace(result.workspace);
        setMembership(result.membership);
        setUser(mapPractitionerToUser(result.practitioner, result.workspace));

        return { success: true };
      } catch (err: any) {
        const msg = err.message || 'Registration failed. Please try again.';
        setAuthError(msg);
        return { success: false, error: msg };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async (): Promise<void> => {
    const rawRefreshToken = tokenStore.getRefreshToken();
    tokenStore.clear();

    setPractitioner(null);
    setWorkspace(null);
    setMembership(null);
    setUser(null);
    setAuthError(null);

    // Call backend to revoke the session asynchronously
    if (rawRefreshToken) {
      await authApi.logout(rawRefreshToken);
    }
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const refreshToken = tokenStore.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const tokens = await authApi.refresh(refreshToken);
      tokenStore.setAccessToken(tokens.accessToken, tokens.expiresIn);
      tokenStore.setRefreshToken(tokens.refreshToken);

      const me = await authApi.getMe(tokens.accessToken);
      setPractitioner(me.practitioner);
      setWorkspace(me.workspace);
      setMembership(me.membership);
      setUser(mapPractitionerToUser(me.practitioner, me.workspace));
      return true;
    } catch {
      await logout();
      return false;
    }
  }, [logout]);

  const updateUser = useCallback(
    (updatedData: Partial<User>) => {
      if (!user) return;
      const updated = { ...user, ...updatedData };
      setUser(updated);
    },
    [user]
  );

  const role = membership?.role ?? null;
  const clinicalAuthorized = Boolean(
    membership &&
      membership.status === 'active' &&
      membership.clinical_authorized === true &&
      (membership.role === 'workspace_owner' || membership.role === 'clinical_practitioner')
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        practitioner,
        workspace,
        membership,
        role,
        clinicalAuthorized,
        isAuthenticated: !!user && !!workspace,
        isLoading,
        authError,
        login,
        register,
        logout,
        updateUser,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: null,
      practitioner: null,
      workspace: null,
      membership: null,
      role: null,
      clinicalAuthorized: false,
      isAuthenticated: false,
      isLoading: false,
      authError: null,
      login: async () => ({ success: false, error: 'Auth provider not found' }),
      register: async () => ({ success: false, error: 'Auth provider not found' }),
      logout: async () => {},
      refreshSession: async () => false,
      clearAuthError: () => {},
    };
  }
  return context;
};
