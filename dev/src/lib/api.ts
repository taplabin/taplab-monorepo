import { auth } from './firebase';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'https://api.taplab.in';

export async function devFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await auth.currentUser?.getIdToken();
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
}
