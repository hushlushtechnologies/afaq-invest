import type { ApiError } from '@afaq/types';

export interface ApiClientOptions {
  baseUrl: string;
  getToken?: () => string | null | Promise<string | null>;
}

/**
 * A request the API refused or could not complete.
 *
 * `reason` carries the API's machine-readable explanation — "suspended",
 * "missing_permission" and so on — so the interface can say something useful
 * rather than just "forbidden".
 */
export class ApiRequestError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly reason?: string,
    public readonly permission?: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

interface ApiErrorBody extends ApiError {
  reason?: string;
  permission?: string;
}

export function createApiClient({ baseUrl, getToken }: ApiClientOptions) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Content-Type', 'application/json');

    const token = await getToken?.();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(`${baseUrl}${path}`, { ...init, headers });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
      throw new ApiRequestError(
        response.status,
        body?.message ?? response.statusText,
        body?.reason,
        body?.permission,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  return {
    get: <T>(path: string) => request<T>(path, { method: 'GET' }),
    post: <T>(path: string, body: unknown) =>
      request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
    patch: <T>(path: string, body: unknown) =>
      request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
