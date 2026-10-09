import { apiFetch } from './api';

export interface LoginData {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
}

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: 'PLAYER' | 'ADMIN';
}

export async function login(
  data: LoginData,
): Promise<LoginResponse> {
  const response = await apiFetch<LoginResponse>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
  );

  saveToken(response.access_token);

  return response;
}

export function saveToken(token: string) {
  if (typeof window === 'undefined') return;

  localStorage.setItem('token', token);
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;

  return localStorage.getItem('token');
}

export function logout() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('token');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

/**
 * Obtiene la información del usuario
 * almacenada dentro del JWT.
 */
export function getCurrentUser(): AuthUser | null {
  const token = getToken();

  if (!token) {
    return null;
  }

  try {
    const payload = token.split('.')[1];

    if (!payload) {
      return null;
    }

    const decoded = JSON.parse(
      atob(
        payload
          .replace(/-/g, '+')
          .replace(/_/g, '/'),
      ),
    );

    return {
      id: Number(decoded.sub),
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    };
  } catch {
    return null;
  }
}