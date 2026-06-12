import type { DocumentStatus, TaskStage, TaskStatus, TaskType } from './document';

export interface AdminUserStats {
  total_users: number;
  admin_users: number;
  today_users: number;
}

export interface AdminDocumentStats {
  total: number;
  uploaded_today: number;
  by_status: Partial<Record<DocumentStatus, number>>;
}

export interface AdminTaskStats {
  total: number;
  by_status: Partial<Record<TaskStatus, number>>;
  by_type: Partial<Record<TaskType, number>>;
}

export interface AdminRecentEvent {
  id: string;
  event_type: string;
  message: string;
  occurred_at: string;
  document_id: string | null;
  document_name: string | null;
  task_type: TaskType | string | null;
  status: TaskStatus | DocumentStatus | string | null;
}

export interface AdminDashboardSummaryResponse {
  users: AdminUserStats;
  documents: AdminDocumentStats;
  tasks: AdminTaskStats;
  recent_events: AdminRecentEvent[];
}

export interface AdminOwnerResponse {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface AdminPaginationResponse {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface AdminTaskDocumentResponse {
  id: string;
  file_name: string;
  status: DocumentStatus | string;
  category: string | null;
  upload_at: string;
  updated_at: string;
}

export interface AdminTaskListItemResponse {
  id: string;
  task_type: TaskType | string;
  status: TaskStatus | string;
  stage: TaskStage | string | null;
  progress: number;
  message: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  document: AdminTaskDocumentResponse;
  owner: AdminOwnerResponse;
}

export interface AdminTaskListResponse {
  items: AdminTaskListItemResponse[];
  pagination: AdminPaginationResponse;
}

export type AdminTaskDetailResponse = AdminTaskListItemResponse;

export interface AdminTaskListParams {
  page?: number;
  limit?: number;
  status?: TaskStatus;
  task_type?: TaskType;
  stage?: TaskStage;
  document_id?: string;
  owner_id?: string;
  search?: string;
  created_from?: string;
  created_to?: string;
  sort_by?: 'created_at' | 'updated_at' | 'started_at' | 'completed_at' | 'progress' | 'status' | 'task_type';
  sort_order?: 'asc' | 'desc';
}
