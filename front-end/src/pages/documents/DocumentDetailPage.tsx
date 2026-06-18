import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  Bot,
  Calendar,
  CheckCircle2,
  Tag,
  ClipboardCheck,
  Download,
  FileText,
  FileType,
  Layers,
  Loader2,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Trash2,
  XCircle,
} from 'lucide-react';

import {
  cancelDocument,
  deleteUserDocument,
  downloadDocumentOriginal,
  getDocumentSummary,
  reprocessDocument,
} from '../../api/document';
import { PageTopNav } from '../../components/common/PageTopNav';
import { StatusBadge } from '../../components/common/StatusBadge';
import type { DocumentSummaryResponse } from '../../types/document';
import { normalizeDocumentStatus } from '../../utils/documentStatus';

function formatBytes(bytes?: number | null) {
  if (!bytes) return '-';

  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value?: string | null) {
  if (!value) return '-';

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string; message?: string } } }).response;
    return response?.data?.detail ?? response?.data?.message ?? '문서 상세 정보를 불러오지 못했습니다.';
  }

  if (error instanceof Error) return error.message;

  return '문서 상세 정보를 불러오지 못했습니다.';
}

function canReprocessDocument(status: string) {
  return status === 'REVIEW_REQUIRED' || status === 'COMPLETED' || status === 'FAILED';
}

function canCancelDocument(status: string) {
  return status === 'PROCESSING';
}

function formatConfidence(confidence?: number | null) {
  if (confidence === null || confidence === undefined) return '-';
  return `${Math.round(confidence * 100)}%`;
}

export function DocumentDetailPage() {
  const navigate = useNavigate();
  const { documentId } = useParams();
  const [documentData, setDocumentData] = useState<DocumentSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(documentId));
  const [error, setError] = useState<string | null>(documentId ? null : '문서 ID가 없습니다.');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isReprocessModalOpen, setIsReprocessModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  const loadDocument = useCallback(async () => {
    if (!documentId) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await getDocumentSummary(documentId);
      setDocumentData(data);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    if (!documentId) {
      return;
    }

    let isMounted = true;

    const loadDocument = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getDocumentSummary(documentId);
        if (isMounted) setDocumentData(data);
      } catch (loadError) {
        if (isMounted) setError(getErrorMessage(loadError));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadDocument();

    return () => {
      isMounted = false;
    };
  }, [documentId]);

  const normalizedStatus = normalizeDocumentStatus(documentData?.status);
  const canOpenCompletedViews = normalizedStatus === 'COMPLETED';
  const canOpenReview = normalizedStatus === 'REVIEW_REQUIRED';
  const canDelete = normalizedStatus === 'REVIEW_REQUIRED' || normalizedStatus === 'COMPLETED' || normalizedStatus === 'FAILED';
  const canReprocess = canReprocessDocument(normalizedStatus);
  const canCancel = canCancelDocument(normalizedStatus);
  const summaryPreview = useMemo(() => {
    const summary = documentData?.summary?.trim();
    if (!summary) return '저장된 요약이 없습니다. 처리 상태를 확인하거나 OCR 검토를 진행해주세요.';
    return summary.length > 420 ? `${summary.slice(0, 420)}...` : summary;
  }, [documentData?.summary]);

  const handleDownload = async () => {
    if (!documentId || !documentData) return;

    try {
      setActionError(null);
      setActionMessage(null);
      setIsDownloading(true);
      const fileName = await downloadDocumentOriginal(documentId, documentData.file_name);
      setActionMessage(`${fileName} 다운로드를 시작했습니다.`);
    } catch (downloadError) {
      setActionError(getErrorMessage(downloadError));
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!documentId) return;

    try {
      setActionError(null);
      setActionMessage(null);
      setIsDeleting(true);
      await deleteUserDocument(documentId);
      navigate('/documents', {
        replace: true,
        state: { message: '문서를 삭제했습니다.' },
      });
    } catch (deleteError) {
      setActionError(getErrorMessage(deleteError));
      setIsDeleteModalOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReprocess = async () => {
    if (!documentId) return;

    try {
      setActionError(null);
      setActionMessage(null);
      setIsReprocessing(true);
      const response = await reprocessDocument(documentId);
      setActionMessage(response.message || '문서 재처리를 시작했습니다.');
      setIsReprocessModalOpen(false);
      await loadDocument();
    } catch (reprocessError) {
      setActionError(getErrorMessage(reprocessError));
      setIsReprocessModalOpen(false);
    } finally {
      setIsReprocessing(false);
    }
  };

  const handleCancelProcessing = async () => {
    if (!documentId) return;

    try {
      setActionError(null);
      setActionMessage(null);
      setIsCancelling(true);
      const response = await cancelDocument(documentId);
      setActionMessage(response.message || '문서 처리를 취소했습니다.');
      setIsCancelModalOpen(false);
      await loadDocument();
    } catch (cancelError) {
      setActionError(getErrorMessage(cancelError));
      setIsCancelModalOpen(false);
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f0f17] text-white">
      <PageTopNav
        backTo="/documents"
        rightActions={
          <button
            type="button"
            onClick={() => documentId && navigate(`/documents/${documentId}/status`)}
            disabled={!documentId}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            처리 상태
          </button>
        }
      />

      <main className="p-6">
        <div className="mx-auto max-w-6xl space-y-6">
          {isLoading && (
            <div className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-blue-200">
              <Loader2 className="h-5 w-5 animate-spin" />
              문서 상세 정보를 불러오는 중입니다.
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          )}

          {actionMessage && (
            <div className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-green-200">
              <CheckCircle2 className="h-5 w-5" />
              {actionMessage}
            </div>
          )}

          {actionError && (
            <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">
              <AlertCircle className="h-5 w-5" />
              {actionError}
            </div>
          )}

          {documentData && (
            <>
              <section className="rounded-xl border border-white/10 bg-[#15151c] p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-blue-300/20 bg-blue-500/10">
                      <FileText className="h-7 w-7 text-blue-300" />
                    </div>
                    <div className="min-w-0">
                      <h1 className="truncate text-2xl font-bold">{documentData.file_name}</h1>
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-zinc-300">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          {formatDate(documentData.upload_at)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <FileType className="h-4 w-4" />
                          {formatBytes(documentData.file_size)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Layers className="h-4 w-4" />
                          {documentData.page_count ?? 0} 페이지
                        </span>
                        {documentData.category && (
                          <span className="inline-flex items-center gap-1.5 rounded border border-white/10 bg-white/5 px-2 py-1 text-zinc-200">
                            <Tag className="h-4 w-4" />
                            {documentData.category.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={documentData.status} />
                </div>
              </section>

              <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
                <article className="rounded-xl border border-white/10 bg-[#15151c] p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-300" />
                    <h2 className="text-lg font-semibold">요약 미리보기</h2>
                  </div>
                  <p className="whitespace-pre-wrap leading-7 text-zinc-200">{summaryPreview}</p>
                </article>

                <aside className="space-y-4">
                  <button
                    type="button"
                    onClick={() => documentId && navigate(`/documents/${documentId}/summary`)}
                    disabled={!canOpenCompletedViews}
                    title={canOpenCompletedViews ? undefined : '요약은 문서 처리 완료 후 확인할 수 있습니다.'}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-primary to-blue-500 px-4 py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Sparkles className="h-4 w-4" />
                    요약 보기
                  </button>
                  <button
                    type="button"
                    onClick={() => documentId && navigate(`/documents/${documentId}/chat`)}
                    disabled={!canOpenCompletedViews}
                    title={canOpenCompletedViews ? undefined : '채팅은 문서 처리 완료 후 준비됩니다.'}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <MessageSquare className="h-4 w-4" />
                    문서 채팅
                  </button>
                  <button
                    type="button"
                    onClick={() => documentId && navigate(`/documents/${documentId}/review`)}
                    disabled={!canOpenReview}
                    title={canOpenReview ? undefined : 'OCR 검토는 검토 대기 문서에서 사용할 수 있습니다.'}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-purple-500/20 bg-purple-500/10 px-4 py-3 text-sm font-medium text-purple-200 transition-colors hover:bg-purple-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ClipboardCheck className="h-4 w-4" />
                    OCR 검토
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDownload()}
                    disabled={!documentId || isDownloading}
                    title="원본 다운로드"
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    원본 다운로드
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsReprocessModalOpen(true)}
                    disabled={!canReprocess || isReprocessing}
                    title={canReprocess ? '문서 재처리' : '처리 대기/진행 중인 문서는 재처리할 수 없습니다.'}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-4 py-3 text-sm font-medium text-yellow-200 transition-colors hover:bg-yellow-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isReprocessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    재처리
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsCancelModalOpen(true)}
                    disabled={!canCancel || isCancelling}
                    title={canCancel ? '처리 취소' : '처리 중인 문서만 취소할 수 있습니다.'}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    처리 취소
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(true)}
                    disabled={!canDelete || isDeleting}
                    title={canDelete ? '문서 삭제' : '처리 대기/진행 중인 문서는 삭제할 수 없습니다.'}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    삭제
                  </button>
                </aside>
              </section>

              <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="rounded-xl border border-white/10 bg-[#15151c] p-5">
                  <CheckCircle2 className="mb-3 h-5 w-5 text-green-300" />
                  <p className="text-sm text-zinc-400">처리 완료 시간</p>
                  <p className="mt-1 font-semibold text-white">{formatDate(documentData.process_at)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#15151c] p-5">
                  <Bot className="mb-3 h-5 w-5 text-purple-300" />
                  <p className="text-sm text-zinc-400">LLM 모델</p>
                  <p className="mt-1 font-semibold text-white">{documentData.llm_model ?? '-'}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#15151c] p-5">
                  <Layers className="mb-3 h-5 w-5 text-blue-300" />
                  <p className="text-sm text-zinc-400">임베딩 모델</p>
                  <p className="mt-1 font-semibold text-white">{documentData.embedding_model ?? '-'}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-[#15151c] p-5">
                  <Tag className="mb-3 h-5 w-5 text-cyan-300" />
                  <p className="text-sm text-zinc-400">카테고리</p>
                  <p className="mt-1 font-semibold text-white">{documentData.category?.name ?? '-'}</p>
                  <p className="mt-1 text-xs text-zinc-400">신뢰도 {formatConfidence(documentData.category?.confidence)}</p>
                </div>
              </section>
            </>
          )}
        </div>
      </main>

      {isDeleteModalOpen && documentData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#15151c] p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                <Trash2 className="h-5 w-5 text-red-300" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-white">문서 삭제 확인</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  <span className="font-medium text-white">{documentData.file_name}</span> 문서를 삭제합니다.
                  삭제된 문서와 처리 데이터는 복구할 수 없습니다.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {isReprocessModalOpen && documentData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#15151c] p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-yellow-500/10">
                <RefreshCw className="h-5 w-5 text-yellow-300" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-white">문서 재처리 확인</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  <span className="font-medium text-white">{documentData.file_name}</span> 문서를 OCR 단계부터 다시 처리하시겠습니까?
                  기존 요약/임베딩 결과는 재생성됩니다.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsReprocessModalOpen(false)}
                disabled={isReprocessing}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleReprocess()}
                disabled={isReprocessing}
                className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isReprocessing && <Loader2 className="h-4 w-4 animate-spin" />}
                재처리
              </button>
            </div>
          </div>
        </div>
      )}

      {isCancelModalOpen && documentData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#15151c] p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-300" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-white">처리 취소 확인</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  <span className="font-medium text-white">{documentData.file_name}</span> 문서의 현재 처리를 취소하시겠습니까?
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                disabled={isCancelling}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => void handleCancelProcessing()}
                disabled={isCancelling}
                className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isCancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                처리 취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
