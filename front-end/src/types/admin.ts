import type { UserRole } from '../utils/auth';
import type { DocumentStatus, TaskStage, TaskStatus, TaskType } from './document';

export type AdminHealthServiceStatus = 'HEALTHY' | 'WARNING' | 'ERROR' | 'OFFLINE';

export interface AdminHealthService {
  key: string;
  name: string;
  status: AdminHealthServiceStatus;
  details: string | null;
  checked_at: string | null;
}

export interface AdminSystemHealthResponse {
  services: AdminHealthService[];
}

export type AdminSettingValue = string | number | boolean | string[] | null;

export interface AdminSettingItem {
  key: string;
  label: string;
  value: AdminSettingValue;
  editable: boolean;
  sensitive: boolean;
}

export interface AdminSettingsCategory {
  id: string;
  name: string;
  settings: AdminSettingItem[];
}

export interface AdminSettingsResponse {
  categories: AdminSettingsCategory[];
}

export type AdminWorkerStatus = 'ACTIVE' | 'IDLE' | 'OFFLINE' | 'WARNING';

export interface AdminQueueItem {
  name: string;
  pending_count: number;
  active_count?: number | null;
  scheduled_count?: number | null;
  reserved_count?: number | null;
  failed_count?: number | null;
  oldest_task_age_seconds?: number | null;
  status?: string | null;
  details?: string | null;
  checked_at?: string | null;
}

export interface AdminQueueListResponse {
  queues: AdminQueueItem[];
  checked_at: string;
  status?: string | null;
  details?: string | null;
}

export interface AdminWorkerItem {
  id: string;
  name: string;
  status: AdminWorkerStatus;
  active_task_count?: number | null;
  reserved_task_count?: number | null;
  scheduled_task_count?: number | null;
  processed_count?: number | null;
  current_queues?: string[] | null;
  checked_at: string;
  details?: string | null;
}

export interface AdminWorkerListResponse {
  workers: AdminWorkerItem[];
  checked_at: string;
  status?: string | null;
  details?: string | null;
}

export type AdminLogLevel = 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS';

export interface AdminLogItem {
  id: string;
  timestamp: string;
  level: AdminLogLevel;
  service: string | null;
  source: string;
  message: string;
  details: Record<string, string | number | null> | null;
  related_task_id: string | null;
  related_document_id: string | null;
}

export interface AdminLogsResponse {
  items: AdminLogItem[];
  pagination: AdminPaginationResponse;
  warning_message?: string | null;
}

export interface AdminLogSummaryResponse {
  total: number;
  info: number;
  warning: number;
  error: number;
  success: number;
  recent_errors: AdminLogItem[];
  warning_message?: string | null;
}

export interface AdminLogListParams {
  q?: string;
  level?: AdminLogLevel;
  service?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

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

export type AdminDocumentOwner = AdminOwnerResponse;
export type AdminPagination = AdminPaginationResponse;

export interface AdminLatestTask {
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
}

export interface AdminDocumentItem {
  id: string;
  file_name: string;
  status: DocumentStatus | string;
  category: string | null;
  file_size: number;
  page_count: number | null;
  selected_embedding_model: string | null;
  upload_at: string;
  process_at: string | null;
  created_at: string;
  updated_at: string;
  owner: AdminDocumentOwner;
  latest_task: AdminLatestTask | null;
}

export interface AdminDocumentListResponse {
  items: AdminDocumentItem[];
  pagination: AdminPagination;
}

export interface AdminDocumentDetailResponse extends AdminDocumentItem {
  summary: string | null;
  chunk_count: number;
  keywords: string[];
}

export interface AdminDocumentListParams {
  page?: number;
  limit?: number;
  status?: DocumentStatus;
  owner_id?: string;
  search?: string;
  uploaded_from?: string;
  uploaded_to?: string;
  sort_by?: 'upload_at' | 'updated_at' | 'file_name' | 'file_size' | 'page_count' | 'status';
  sort_order?: 'asc' | 'desc';
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

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: UserRole | string;
  document_count: number;
  upload_count: number;
  created_at: string;
  updated_at: string;
}

export interface AdminUserDocument {
  id: string;
  file_name: string;
  status: DocumentStatus | string;
  upload_at: string;
}

export type AdminUserRecentTask = AdminTaskListItemResponse;

export interface AdminUsersResponse {
  items: AdminUserItem[];
  pagination: AdminPaginationResponse;
}

export interface AdminUserDetail extends AdminUserItem {
  documents: AdminUserDocument[];
  recent_tasks: AdminUserRecentTask[];
}

export interface AdminUserListParams {
  page?: number;
  limit?: number;
  q?: string;
  role?: UserRole;
  sort_by?: 'created_at' | 'updated_at' | 'name' | 'email' | 'role' | 'document_count' | 'upload_count';
  sort_order?: 'asc' | 'desc';
}
