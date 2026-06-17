import { apiClient } from './client';
import type {
  DocumentActionResponse,
  DocumentChatRequest,
  DocumentChatResponse,
  DocumentDeleteResponse,
  DocumentMarkdownResponse,
  DocumentSummaryResponse,
  DocumentStatusResponse,
  DocumentUploadResponse,
  DocumentItem,
  EmbeddingModelsResponse
} from '@/types/document';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

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

export async function downloadDocumentOriginal(documentId: string, fileName?: string): Promise<string> {
  try {
    const response = await apiClient.get<Blob>(`/api/documents/${documentId}/download`, {
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

export async function deleteUserDocument(documentId: string): Promise<DocumentDeleteResponse> {
  const response = await apiClient.delete<DocumentDeleteResponse>(`/api/documents/${documentId}`);
  return response.data;
}

export async function reprocessDocument(documentId: string): Promise<DocumentActionResponse> {
  const response = await apiClient.post<DocumentActionResponse>(`/api/documents/${documentId}/reprocess`);
  return response.data;
}

export async function cancelDocument(documentId: string): Promise<DocumentActionResponse> {
  const response = await apiClient.post<DocumentActionResponse>(`/api/documents/${documentId}/cancel`);
  return response.data;
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
