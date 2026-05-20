import type { AuthSession, RegisterInput, LoginInput, AuthMe, Tokens } from '@snooker/shared';

const BASE_URL =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) ||
  'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(code);
    this.name = 'ApiError';
  }
}

type FetchOptions = RequestInit & { token?: string | null };

async function request<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { token, headers, ...rest } = opts;
  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  if (!res.ok) {
    let code = 'generic.internal';
    let details: unknown;
    try {
      const body = (await res.json()) as { error?: { code?: string; details?: unknown } };
      code = body.error?.code ?? code;
      details = body.error?.details;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, code, details);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  auth: {
    register: (input: RegisterInput) =>
      request<AuthSession>('/auth/register', { method: 'POST', body: JSON.stringify(input) }),
    login: (input: LoginInput) =>
      request<AuthSession>('/auth/login', { method: 'POST', body: JSON.stringify(input) }),
    refresh: (refreshToken: string) =>
      request<Tokens>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),
    logout: (refreshToken: string) =>
      request<void>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      }),
    me: (token: string) => request<AuthMe>('/auth/me', { token }),
  },
};
