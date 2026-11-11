/**
 * ============================================================================
 * PHYSIOCASE — FRONTEND API CLIENT & TOKEN SERVICES
 * Milestone: Pre-B7A Multi-User Integration
 * ============================================================================
 */

import type {
  RegisterOwnerRequest,
  LoginRequest,
  AuthResult,
  AuthTokens,
  WorkspaceSummary,
  WorkspaceMembership,
  PractitionerIdentity,
} from '../types/auth';

const REFRESH_TOKEN_STORAGE_KEY = 'physiocase_auth_refresh_token';
const REMEMBER_ME_KEY = 'physiocase_auth_remember_me';

// In-memory access token storage (XSS protection: never written to localStorage)
let memoryAccessToken: string | null = null;
let tokenExpiresAt: number | null = null;

export const tokenStore = {
  getAccessToken(): string | null {
    return memoryAccessToken;
  },
  setAccessToken(token: string | null, expiresInSeconds?: number): void {
    memoryAccessToken = token;
    if (token && expiresInSeconds) {
      tokenExpiresAt = Date.now() + expiresInSeconds * 1000;
    } else {
      tokenExpiresAt = null;
    }
  },
  isAccessTokenExpiringSoon(): boolean {
    if (!memoryAccessToken || !tokenExpiresAt) return true;
    // Expiring within 60 seconds
    return Date.now() > tokenExpiresAt - 60000;
  },
  getRefreshToken(): string | null {
    try {
      const isRemembered = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
      if (isRemembered) {
        return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
      }
      return sessionStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  },
  setRefreshToken(refreshToken: string | null, rememberMe = false): void {
    try {
      if (rememberMe) {
        localStorage.setItem(REMEMBER_ME_KEY, 'true');
        if (refreshToken) {
          localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
        } else {
          localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
        }
        sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      } else {
        localStorage.removeItem(REMEMBER_ME_KEY);
        localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
        if (refreshToken) {
          sessionStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken);
        } else {
          sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
        }
      }
    } catch (e) {
      console.error('Storage error for refresh token:', e);
    }
  },
  clear(): void {
    memoryAccessToken = null;
    tokenExpiresAt = null;
    try {
      localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
      localStorage.removeItem(REMEMBER_ME_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    } catch (e) {
      console.error('Storage clear error:', e);
    }
  },
};

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Custom fetch wrapper that handles JSON deserialization, auth headers, and automatic token refresh.
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  let token = tokenStore.getAccessToken();

  // If token is expiring soon and we have a refresh token, try refreshing before calling
  if (token && tokenStore.isAccessTokenExpiringSoon()) {
    const refreshToken = tokenStore.getRefreshToken();
    if (refreshToken) {
      try {
        const refreshed = await authApi.refresh(refreshToken);
        tokenStore.setAccessToken(refreshed.accessToken, refreshed.expiresIn);
        tokenStore.setRefreshToken(refreshed.refreshToken);
        token = refreshed.accessToken;
      } catch (err) {
        // Refresh failed, proceed with existing token or clear
        tokenStore.clear();
        token = null;
      }
    }
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized with token refresh retry
  if (response.status === 401 && token) {
    const refreshToken = tokenStore.getRefreshToken();
    if (refreshToken) {
      try {
        const refreshed = await authApi.refresh(refreshToken);
        tokenStore.setAccessToken(refreshed.accessToken, refreshed.expiresIn);
        tokenStore.setRefreshToken(refreshed.refreshToken);

        // Retry original request with new token
        headers.set('Authorization', `Bearer ${refreshed.accessToken}`);
        const retryRes = await fetch(endpoint, {
          ...options,
          headers,
        });

        if (!retryRes.ok) {
          const errData = await retryRes.json().catch(() => ({}));
          throw new ApiError(retryRes.status, errData.error || retryRes.statusText, errData);
        }

        return await retryRes.json();
      } catch (refreshErr) {
        tokenStore.clear();
        throw new ApiError(401, 'Session expired. Please log in again.');
      }
    } else {
      tokenStore.clear();
      throw new ApiError(401, 'Session expired. Please log in again.');
    }
  }

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new ApiError(response.status, errData.error || response.statusText, errData);
  }

  // If empty response (204)
  if (response.status === 204) {
    return {} as T;
  }

  return await response.json();
}

/**
 * Centralized Authentication API endpoints.
 */
export const authApi = {
  async register(req: RegisterOwnerRequest): Promise<AuthResult> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new ApiError(res.status, data.error || 'Registration failed');
    }
    return data;
  },

  async login(req: LoginRequest): Promise<AuthResult> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new ApiError(res.status, data.error || 'Login failed');
    }
    return data;
  },

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new ApiError(res.status, data.error || 'Token refresh failed');
    }
    return data;
  },

  async logout(refreshToken?: string, sessionId?: string): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken, sessionId }),
      });
    } catch (e) {
      console.warn('Network error during backend logout call:', e);
    }
  },

  async getMe(accessToken?: string): Promise<{
    practitioner: PractitionerIdentity;
    workspace: WorkspaceSummary;
    membership: WorkspaceMembership;
    capabilities: {
      isOwner: boolean;
      isClinicallyAuthorized: boolean;
      canMutateClinical: boolean;
      canAdministerWorkspace: boolean;
    };
  }> {
    const token = accessToken || tokenStore.getAccessToken();
    const res = await fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new ApiError(res.status, data.error || 'Failed to resolve session context');
    }
    return data;
  },

  async listWorkspaces(): Promise<
    Array<{ workspace: WorkspaceSummary; membership: WorkspaceMembership }>
  > {
    return apiFetch<{ workspaces: Array<{ workspace: WorkspaceSummary; membership: WorkspaceMembership }> }>(
      '/api/workspaces'
    ).then((r) => r.workspaces);
  },

  async switchWorkspace(targetWorkspaceId: string): Promise<AuthResult> {
    return apiFetch<AuthResult>('/api/workspaces/switch', {
      method: 'POST',
      body: JSON.stringify({ targetWorkspaceId }),
    });
  },
};
