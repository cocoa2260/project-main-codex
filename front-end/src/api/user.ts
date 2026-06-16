import { apiClient } from './client';
import { saveAuthUser, type AuthUser, type UserRole } from '../utils/auth';

interface BackendUserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
}

export interface UpdateUserProfileRequest {
  name: string;
}

export interface UpdateUserPasswordRequest {
  current_password: string;
  new_password: string;
}

export interface UpdateUserPasswordResponse {
  message: string;
}

function normalizeRole(role?: string): UserRole {
  return role?.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'USER';
}

function normalizeUserProfile(data: BackendUserProfile): AuthUser {
  return {
    id: data.id,
    email: data.email,
    name: data.name,
    role: normalizeRole(data.role),
    status: data.status,
  };
}

export async function updateMyProfile(request: UpdateUserProfileRequest) {
  const { data } = await apiClient.patch<BackendUserProfile>('/api/users/me/profile', request);
  const user = normalizeUserProfile(data);
  saveAuthUser(user);
  return user;
}

export async function updateMyPassword(request: UpdateUserPasswordRequest) {
  const { data } = await apiClient.patch<UpdateUserPasswordResponse>('/api/users/me/password', request);
  return data;
}
