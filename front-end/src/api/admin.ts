import { apiClient } from './client';
import type {
  AdminAuditLogListParams,
  AdminAuditLogsResponse,
  AdminDashboardSummaryResponse,
  AdminDocumentDetailResponse,
  AdminDocumentListParams,
  AdminDocumentListResponse,
  AdminLogListParams,
  AdminLogsResponse,
  AdminLogSummaryResponse,
  AdminQueueListResponse,
  AdminSettingsResponse,
  AdminSystemHealthResponse,
  AdminTaskDetailResponse,
  AdminTaskListParams,
  AdminTaskListResponse,
  AdminUserDetail,
  AdminUserListParams,
  AdminUserRoleUpdateRequest,
  AdminUserRoleUpdateResponse,
  AdminUserStatus,
  AdminUserStatusUpdateRequest,
  AdminUserStatusUpdateResponse,
  AdminUsersResponse,
  AdminWorkerListResponse,
} from '@/types/admin';
import type { UserRole } from '@/utils/auth';

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummaryResponse> {
  const response = await apiClient.get<AdminDashboardSummaryResponse>('/api/admin/dashboard/summary');
  return response.data;
}

export async function getAdminSystemHealth(): Promise<AdminSystemHealthResponse> {
  const response = await apiClient.get<AdminSystemHealthResponse>('/api/admin/system/health');
  return response.data;
}

export async function getAdminSettings(): Promise<AdminSettingsResponse> {
  const response = await apiClient.get<AdminSettingsResponse>('/api/admin/settings');
  return response.data;
}

export async function getAdminQueues(): Promise<AdminQueueListResponse> {
  const response = await apiClient.get<AdminQueueListResponse>('/api/admin/queues');
  return response.data;
}

export async function getAdminWorkers(): Promise<AdminWorkerListResponse> {
  const response = await apiClient.get<AdminWorkerListResponse>('/api/admin/workers');
  return response.data;
}

export async function getAdminLogs(params?: AdminLogListParams): Promise<AdminLogsResponse> {
  const response = await apiClient.get<AdminLogsResponse>('/api/admin/logs', { params });
  return response.data;
}

export async function getAdminLogSummary(): Promise<AdminLogSummaryResponse> {
  const response = await apiClient.get<AdminLogSummaryResponse>('/api/admin/logs/summary');
  return response.data;
}

export async function getAdminAuditLogs(params?: AdminAuditLogListParams): Promise<AdminAuditLogsResponse> {
  const response = await apiClient.get<AdminAuditLogsResponse>('/api/admin/audit-logs', { params });
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

export async function updateAdminUserRole(userId: string, role: UserRole): Promise<AdminUserRoleUpdateResponse> {
  const payload: AdminUserRoleUpdateRequest = { role };
  const response = await apiClient.patch<AdminUserRoleUpdateResponse>(`/api/admin/users/${userId}/role`, payload);
  return response.data;
}

export async function updateAdminUserStatus(
  userId: string,
  status: AdminUserStatus,
  reason?: string,
): Promise<AdminUserStatusUpdateResponse> {
  const payload: AdminUserStatusUpdateRequest = {
    status,
    ...(reason?.trim() ? { reason: reason.trim() } : {}),
  };
  const response = await apiClient.patch<AdminUserStatusUpdateResponse>(`/api/admin/users/${userId}/status`, payload);
  return response.data;
}
