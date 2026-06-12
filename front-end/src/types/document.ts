// 문서 자체 상태
export type DocumentStatus =
  | "PENDING"
  | "PROCESSING"
  | "REVIEW_REQUIRED"
  | "COMPLETED"
  | "FAILED";

export type TaskStatus =
  | "PENDING"
  | "PROCESSING"
  | "COMPLETED"
  | "FAILED";

export type TaskType =
  | "OCR"
  | "SUMMARY"
  | "EMBEDDING"
  | "RAG_INDEXING";

export type TaskStage = TaskType;

export type PipelineStepState =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export type PipelineStepId =
  | "upload"
  | "extraction"
  | TaskStage;

export interface PipelineStep {
  id: PipelineStepId;
  label: string;
  state: PipelineStepState;
}


export interface Document {
  id: string;
  name: string;
  uploadDate: string;
  status: DocumentStatus;
  stage?: TaskStage;
  progress: number;
  pages?: number;
  summary?: string;
}

// DocumentList에서 사용하는 interface
// 추후 개발 시 위에 Document와 합쳐야 함.(지금은 임시)
export interface DocumentList {
  id: string;
  name: string;
  uploadDate: string;
  size: string;
  pages: number;
  status: DocumentStatus;
  stage?: TaskStage;
  category?: string;
  summary?: string;
  progress?: number;
}

export interface DocumentItem {
  id: string;
  file_name: string;
  status: DocumentStatus;
  category: string | null;
  summary?: string | null;
  page_count: number | null;
  selected_embedding_model: string | null;
  upload_at: string;
}

// Dashboard List 상태 화면 표시용
export type DocumentDisplayStatus =
  | "processing"
  | "review-required"
  | "completed"
  | "failed";

export type DocumentProcessingStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'SUCCESS'
  | 'FAILURE'
  | 'REVIEW_REQUIRED';

export interface DocumentUploadResponse {
  document_id: string;
  task_id: string;
  status: DocumentProcessingStatus | string;
  embedding_model?: string | null;
}

export interface DocumentStatusResponse {
  document_id: string;
  task_id: string | null;
  status: DocumentProcessingStatus | string;
  stage: TaskStage | string | null;
  progress: number;
  message: string | null;
}

export type DocumentStatusEvent = DocumentStatusResponse;

export interface DocumentApiError {
  detail?: string;
  message?: string;
}

export interface DocumentMarkdownResponse {
  document_id: string;
  status: DocumentProcessingStatus | string;
  markdown: string | null;
  embedding_model: string | null;
}

export interface DocumentSummaryResponse {
  document_id: string;
  file_name: string;
  status: DocumentProcessingStatus | string;
  summary: string | null;
  keywords?: string[];
  page_count: number | null;
  file_size: number;
  upload_at: string;
  process_at: string | null;
  embedding_model: string | null;
  llm_model: string | null;
}

export interface DocumentActionResponse {
  document_id: string;
  task_id: string | null;
  status: DocumentProcessingStatus | string;
  message: string;
}

export interface EmbeddingModelOption {
  value: string;
  label: string;
}

export interface EmbeddingModelsResponse {
  default_model: string;
  models: EmbeddingModelOption[];
}
