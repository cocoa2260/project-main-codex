import { apiClient } from './client';
import type {
  DocumentActionResponse,
  DocumentChatRequest,
  DocumentChatResponse,
  DocumentMarkdownResponse,
  DocumentSummaryResponse,
  DocumentStatusResponse,
  DocumentUploadResponse,
  DocumentItem,
  EmbeddingModelsResponse
} from '@/types/document';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export async function getEmbeddingModels(): Promise<EmbeddingModelsResponse> {
  const response = await apiClient.get<EmbeddingModelsResponse>('/api/documents/embedding-models');
  return response.data;
}

export async function getDocuments(): Promise<DocumentItem[]> {
  const response =
    await apiClient.get<DocumentItem[]>(
      "/api/documents"
    )
  return response.data
}

export async function uploadDocument(
  file: File,
  embeddingModel: string,
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('embedding_model', embeddingModel);

  const response = await apiClient.post<DocumentUploadResponse>('/api/documents/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}

export async function getDocumentStatus(documentId: string): Promise<DocumentStatusResponse> {
  const response = await apiClient.get<DocumentStatusResponse>(`/api/documents/${documentId}/status`);
  return response.data;
}

export function getDocumentStatusWebSocketUrl(documentId: string): string {
  const baseUrl = API_BASE_URL.replace(/\/$/, '');
  const wsBaseUrl = baseUrl.startsWith('https://')
    ? baseUrl.replace('https://', 'wss://')
    : baseUrl.replace('http://', 'ws://');

  return `${wsBaseUrl}/api/documents/${documentId}/ws`;
}


export async function getDocumentMarkdown(documentId: string): Promise<DocumentMarkdownResponse> {
  const response = await apiClient.get<DocumentMarkdownResponse>(`/api/documents/${documentId}/markdown`);
  return response.data;
}

export async function getDocumentSummary(documentId: string): Promise<DocumentSummaryResponse> {
  const response = await apiClient.get<DocumentSummaryResponse>(`/api/documents/${documentId}/summary`);
  return response.data;
}

export async function confirmDocumentSummary(documentId: string): Promise<DocumentActionResponse> {
  const response = await apiClient.post<DocumentActionResponse>(`/api/documents/${documentId}/confirm-summary`);
  return response.data;
}

export async function cancelDocumentSummary(documentId: string): Promise<DocumentActionResponse> {
  const response = await apiClient.post<DocumentActionResponse>(`/api/documents/${documentId}/cancel-summary`);
  return response.data;
}

export async function chatWithDocument(
  documentId: string,
  payload: DocumentChatRequest,
): Promise<DocumentChatResponse> {
  const response = await apiClient.post<DocumentChatResponse>(`/api/documents/${documentId}/chat`, payload);
  return response.data;
}
