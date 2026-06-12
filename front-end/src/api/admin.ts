import { apiClient } from './client';
import type {
  AdminDashboardSummaryResponse,
  AdminDocumentDetailResponse,
  AdminDocumentListParams,
  AdminDocumentListResponse,
  AdminTaskDetailResponse,
  AdminTaskListParams,
  AdminTaskListResponse,
  AdminUserDetail,
  AdminUserListParams,
  AdminUsersResponse,
} from '@/types/admin';

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummaryResponse> {
  const response = await apiClient.get<AdminDashboardSummaryResponse>('/api/admin/dashboard/summary');
  return response.data;
}

export async function getAdminDocuments(params?: AdminDocumentListParams): Promise<AdminDocumentListResponse> {
  const response = await apiClient.get<AdminDocumentListResponse>('/api/admin/documents', { params });
  return response.data;
}

export async function getAdminDocumentDetail(documentId: string): Promise<AdminDocumentDetailResponse> {
  const response = await apiClient.get<AdminDocumentDetailResponse>(`/api/admin/documents/${documentId}`);
  return response.data;
}

export async function getAdminTasks(params?: AdminTaskListParams): Promise<AdminTaskListResponse> {
  const response = await apiClient.get<AdminTaskListResponse>('/api/admin/tasks', { params });
  return response.data;
}

export async function getAdminTaskDetail(taskId: string): Promise<AdminTaskDetailResponse> {
  const response = await apiClient.get<AdminTaskDetailResponse>(`/api/admin/tasks/${taskId}`);
  return response.data;
}

export async function getAdminUsers(params?: AdminUserListParams): Promise<AdminUsersResponse> {
  const response = await apiClient.get<AdminUsersResponse>('/api/admin/users', { params });
  return response.data;
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail> {
  const response = await apiClient.get<AdminUserDetail>(`/api/admin/users/${userId}`);
  return response.data;
}
