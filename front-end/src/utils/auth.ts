export type UserRole = 'USER' | 'ADMIN';

export interface AuthUser {
  id?: string;
  email: string;
  name?: string;
  role: UserRole;
}

const ACCESS_TOKEN_KEY = 'access_token';
const TOKEN_TYPE_KEY = 'token_type';
const AUTH_USER_KEY = 'auth_user';

export function saveToken(accessToken: string, tokenType = 'bearer') {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(TOKEN_TYPE_KEY, tokenType);
}

export function getToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getTokenType() {
  return localStorage.getItem(TOKEN_TYPE_KEY) ?? 'bearer';
}

export function saveAuthUser(user: AuthUser) {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function getAuthUser(): AuthUser | null {
  const rawUser = localStorage.getItem(AUTH_USER_KEY);

  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    clearAuth();
    return null;
  }
}

export function isAuthenticated() {
  return Boolean(getToken());
}

export function hasRole(allowedRoles: UserRole[]) {
  const user = getAuthUser();
  return Boolean(user && allowedRoles.includes(user.role));
}

export function clearAuth() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(TOKEN_TYPE_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}
