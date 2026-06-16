import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Calendar,
  CheckCircle2,
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
} from 'lucide-react';

import { getDocumentSummary } from '../../api/document';
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

export function DocumentDetailPage() {
  const navigate = useNavigate();
  const { documentId } = useParams();
  const [documentData, setDocumentData] = useState<DocumentSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(documentId));
  const [error, setError] = useState<string | null>(documentId ? null : '문서 ID가 없습니다.');

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
  const summaryPreview = useMemo(() => {
    const summary = documentData?.summary?.trim();
    if (!summary) return '저장된 요약이 없습니다. 처리 상태를 확인하거나 OCR 검토를 진행해주세요.';
    return summary.length > 420 ? `${summary.slice(0, 420)}...` : summary;
  }, [documentData?.summary]);

  return (
    <div className="min-h-screen bg-[#0f0f17] text-white">
      <header className="sticky top-0 z-20 h-16 border-b border-white/10 bg-[#15151c]/90 backdrop-blur-xl">
        <div className="flex h-full items-center justify-between px-6">
          <button
            type="button"
            onClick={() => navigate('/documents')}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            문서 목록
          </button>
          <button
            type="button"
            onClick={() => documentId && navigate(`/documents/${documentId}/status`)}
            disabled={!documentId}
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            처리 상태
          </button>
        </div>
      </header>

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
                    onClick={() => documentId && navigate(`/documents/${documentId}/workspace`)}
                    disabled={!canOpenCompletedViews}
                    title={canOpenCompletedViews ? undefined : '워크스페이스는 문서 처리 완료 후 사용할 수 있습니다.'}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <FileText className="h-4 w-4" />
                    워크스페이스
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
                    disabled
                    title="사용자 원본 다운로드 API 준비 중"
                    className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-400 opacity-70"
                  >
                    <Download className="h-4 w-4" />
                    원본 다운로드 준비 중
                  </button>
                  <button
                    type="button"
                    disabled
                    title="사용자 재처리 API 준비 중"
                    className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-400 opacity-70"
                  >
                    <RefreshCw className="h-4 w-4" />
                    재처리 준비 중
                  </button>
                  <button
                    type="button"
                    disabled
                    title="사용자 문서 삭제 API 준비 중"
                    className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300 opacity-70"
                  >
                    <Trash2 className="h-4 w-4" />
                    삭제 준비 중
                  </button>
                </aside>
              </section>

              <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
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
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
