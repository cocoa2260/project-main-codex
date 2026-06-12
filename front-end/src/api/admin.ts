import { apiClient } from './client';
import type {
  AdminTaskDetailResponse,
  AdminTaskListParams,
  AdminTaskListResponse,
} from '@/types/admin';

export async function getAdminTasks(params?: AdminTaskListParams): Promise<AdminTaskListResponse> {
  const response = await apiClient.get<AdminTaskListResponse>('/api/admin/tasks', { params });
  return response.data;
}

export async function getAdminTaskDetail(taskId: string): Promise<AdminTaskDetailResponse> {
  const response = await apiClient.get<AdminTaskDetailResponse>(`/api/admin/tasks/${taskId}`);
  return response.data;
}
