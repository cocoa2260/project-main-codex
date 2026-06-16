import { apiClient } from './client';
import type {
  AdminAuditLogListParams,
  AdminAuditLogsResponse,
  AdminDashboardSummaryResponse,
  AdminDocumentDetailResponse,
  AdminDocumentDeleteResponse,
  AdminDocumentListParams,
  AdminDocumentListResponse,
  AdminDocumentRetryRequest,
  AdminDocumentRetryResponse,
  AdminDocumentRetryStage,
  AdminLogListParams,
  AdminLogsResponse,
  AdminLogSummaryResponse,
  AdminHealthService,
  AdminQueueItem,
  AdminQueueListResponse,
  AdminSettingsResponse,
  AdminSystemHealthResponse,
  AdminTaskDetailResponse,
  AdminTaskListParams,
  AdminTaskListResponse,
  AdminTaskRetryResponse,
  AdminUserDetail,
  AdminUserListParams,
  AdminUserRoleUpdateRequest,
  AdminUserRoleUpdateResponse,
  AdminUserStatus,
  AdminUserStatusUpdateRequest,
  AdminUserStatusUpdateResponse,
  AdminUsersResponse,
  AdminWorkerItem,
  AdminWorkerListResponse,
} from '@/types/admin';
import type { UserRole } from '@/utils/auth';

type AdminSystemHealthRawResponse = AdminSystemHealthResponse | AdminHealthService[];
type AdminQueueRawResponse = AdminQueueListResponse | AdminQueueItem[];
type AdminWorkerRawResponse = AdminWorkerListResponse | AdminWorkerItem[];

type BlobErrorResponse = {
  response?: {
    data?: unknown;
    headers?: Record<string, string | undefined>;
  };
};

function sanitizeDownloadFileName(fileName?: string): string {
  const fallback = 'document-original.pdf';
  const trimmed = fileName?.trim();
  if (!trimmed) return fallback;

  return trimmed.replace(/[\\/:*?"<>|]/g, '_') || fallback;
}

function getHeaderValue(headers: Record<string, string | undefined>, headerName: string): string | undefined {
  const lowerHeaderName = headerName.toLowerCase();
  const matchedKey = Object.keys(headers).find((key) => key.toLowerCase() === lowerHeaderName);
  return matchedKey ? headers[matchedKey] : undefined;
}

function getFileNameFromContentDisposition(contentDisposition?: string): string | undefined {
  if (!contentDisposition) return undefined;

  const encodedMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (encodedMatch?.[1]) {
    try {
      return decodeURIComponent(encodedMatch[1].replace(/"/g, ''));
    } catch {
      return encodedMatch[1].replace(/"/g, '');
    }
  }

  const fallbackMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return fallbackMatch?.[1];
}

async function normalizeBlobError(error: unknown): Promise<never> {
  const blobError = error as BlobErrorResponse;
  const data = blobError.response?.data;

  if (data instanceof Blob) {
    const contentType = getHeaderValue(blobError.response?.headers ?? {}, 'content-type') ?? data.type;
    if (contentType.includes('application/json')) {
      try {
        blobError.response!.data = JSON.parse(await data.text());
      } catch {
        // Keep the original blob if the backend did not return parseable JSON.
      }
    }
  }

  throw error;
}

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummaryResponse> {
  const response = await apiClient.get<AdminDashboardSummaryResponse>('/api/admin/dashboard/summary');
  return response.data;
}

export async function getAdminSystemHealth(): Promise<AdminSystemHealthResponse> {
  const response = await apiClient.get<AdminSystemHealthRawResponse>('/api/admin/system/health');
  const data = response.data;

  if (Array.isArray(data)) {
    return { services: data };
  }

  return {
    ...data,
    services: Array.isArray(data.services) ? data.services : [],
  };
}

export async function getAdminSettings(): Promise<AdminSettingsResponse> {
  const response = await apiClient.get<AdminSettingsResponse>('/api/admin/settings');
  return response.data;
}

export async function getAdminQueues(): Promise<AdminQueueListResponse> {
  const response = await apiClient.get<AdminQueueRawResponse>('/api/admin/queues');
  const data = response.data;

  if (Array.isArray(data)) {
    return {
      queues: data,
      checked_at: new Date().toISOString(),
    };
  }

  return {
    ...data,
    queues: Array.isArray(data.queues) ? data.queues : [],
    checked_at: data.checked_at ?? new Date().toISOString(),
  };
}

export async function getAdminWorkers(): Promise<AdminWorkerListResponse> {
  const response = await apiClient.get<AdminWorkerRawResponse>('/api/admin/workers');
  const data = response.data;

  if (Array.isArray(data)) {
    return {
      workers: data,
      checked_at: new Date().toISOString(),
    };
  }

  return {
    ...data,
    workers: Array.isArray(data.workers) ? data.workers : [],
    checked_at: data.checked_at ?? new Date().toISOString(),
  };
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

export async function deleteAdminDocument(documentId: string): Promise<AdminDocumentDeleteResponse> {
  const response = await apiClient.delete<AdminDocumentDeleteResponse>(`/api/admin/documents/${documentId}`);
  return response.data;
}

export async function downloadAdminDocumentOriginal(documentId: string, fileName?: string): Promise<string> {
  try {
    const response = await apiClient.get<Blob>(`/api/admin/documents/${documentId}/export`, {
      params: { format: 'original' },
      responseType: 'blob',
    });

    const contentDisposition = getHeaderValue(response.headers as Record<string, string | undefined>, 'content-disposition');
    const downloadFileName = sanitizeDownloadFileName(
      getFileNameFromContentDisposition(contentDisposition) ?? fileName,
    );
    const url = window.URL.createObjectURL(response.data);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = downloadFileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);

    return downloadFileName;
  } catch (error) {
    return normalizeBlobError(error);
  }
}

export async function retryAdminDocumentFromStage(
  documentId: string,
  retryFromStage: AdminDocumentRetryStage,
  reason?: string,
): Promise<AdminDocumentRetryResponse> {
  const payload: AdminDocumentRetryRequest = {
    retry_from_stage: retryFromStage,
    ...(reason?.trim() ? { reason: reason.trim() } : {}),
  };
  const response = await apiClient.post<AdminDocumentRetryResponse>(
    `/api/admin/documents/${documentId}/retry-from-stage`,
    payload,
  );
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

export async function retryAdminTask(taskId: string): Promise<AdminTaskRetryResponse> {
  const response = await apiClient.post<AdminTaskRetryResponse>(`/api/admin/tasks/${taskId}/retry`);
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
