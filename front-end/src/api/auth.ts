import { apiClient } from './client';
import { saveAuthUser, saveToken, type AuthUser, type UserRole } from '../utils/auth';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

interface BackendUser {
  id?: string;
  email?: string;
  username?: string;
  name?: string;
  role?: string;
  status?: string;
}

interface AuthResponse {
  access_token?: string;
  token?: string;
  token_type?: string;
  user?: BackendUser;
  email?: string;
  name?: string;
  role?: string;
}

function normalizeRole(role?: string): UserRole {
  return role?.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
}

function normalizeUser(response: AuthResponse, fallbackEmail: string): AuthUser {
  const backendUser = response.user;

  return {
    id: backendUser?.id,
    email: backendUser?.email ?? response.email ?? fallbackEmail,
    name: backendUser?.name ?? backendUser?.username ?? response.name,
    role: normalizeRole(backendUser?.role ?? response.role),
    status: backendUser?.status,
  };
}

function persistAuthResponse(response: AuthResponse, fallbackEmail: string) {
  const accessToken = response.access_token ?? response.token;

  if (!accessToken) {
    throw new Error('로그인 응답에 access_token이 없습니다.');
  }

  const tokenType = response.token_type ?? 'bearer';
  const user = normalizeUser(response, fallbackEmail);

  saveToken(accessToken, tokenType);
  saveAuthUser(user);

  return user;
}

export async function login(request: LoginRequest) {
  const { data } = await apiClient.post<AuthResponse>('/api/auth/login', request);
  return persistAuthResponse(data, request.email);
}

export async function signup(request: SignupRequest) {
  const { data } = await apiClient.post<AuthResponse | BackendUser>('/api/auth/signup', request);
  return data;
}

export async function fetchMe() {
  const { data } = await apiClient.get<BackendUser>('/api/auth/me');

  const user: AuthUser = {
    id: data.id,
    email: data.email ?? '',
    name: data.name ?? data.username,
    role: normalizeRole(data.role),
    status: data.status,
  };

  saveAuthUser(user);
  return user;
}
