const POSTGREST_URL = import.meta.env.VITE_POSTGREST_URL || 'http://localhost:3000';
const POSTGREST_SCHEMA = import.meta.env.VITE_POSTGREST_SCHEMA || 'public';
const POSTGREST_API_KEY = import.meta.env.VITE_POSTGREST_API_KEY || 'dummy_key_for_direct_connection';

export const postgrest = {
  baseUrl: POSTGREST_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Prefer': 'return=representation',
    'Authorization': `Bearer ${POSTGREST_API_KEY}`,
    'Accept-Profile': POSTGREST_SCHEMA,
  },
};

export async function pgRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${postgrest.baseUrl}/${endpoint}`, {
    headers: postgrest.headers,
    ...options,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`PostgREST error: ${response.status} - ${error}`);
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

export function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
}