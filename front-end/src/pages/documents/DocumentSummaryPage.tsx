import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Brain,
  Calendar,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  FileType,
  Loader2,
  LogOut,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Tag,
} from 'lucide-react';

import { getDocumentSummary } from '../../api/document';
import type { DocumentSummaryResponse } from '../../types/document';
import { normalizeDocumentStatus } from '../../utils/documentStatus';
import { navigateBackOr } from '../../utils/navigation';

interface DocumentSummaryPageProps {
  onBack?: () => void;
  onLogout?: () => void;
}

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';

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
    return response?.data?.detail ?? response?.data?.message ?? '요약 정보를 불러오지 못했습니다.';
  }

  if (error instanceof Error) return error.message;

  return '요약 정보를 불러오지 못했습니다.';
}

function renderSummary(summary: string) {
  return summary.split('\n').map((line, index) => {
    const key = `${index}-${line.slice(0, 12)}`;

    if (line.startsWith('# ')) {
      return (
        <h1 key={key} className="mt-6 mb-4 text-2xl font-bold text-white first:mt-0">
          {line.slice(2)}
        </h1>
      );
    }

    if (line.startsWith('## ')) {
      return (
        <h2 key={key} className="mt-5 mb-3 text-xl font-bold text-white">
          {line.slice(3)}
        </h2>
      );
    }

    if (line.startsWith('### ')) {
      return (
        <h3 key={key} className="mt-4 mb-2 text-lg font-semibold text-white">
          {line.slice(4)}
        </h3>
      );
    }

    if (line.startsWith('- ')) {
      return (
        <li key={key} className="ml-5 mb-2 text-zinc-200">
          {line.slice(2)}
        </li>
      );
    }

    if (line.trim() === '') {
      return <div key={key} className="h-3" />;
    }

    return (
      <p key={key} className="mb-3 text-zinc-200">
        {line}
      </p>
    );
  });
}

function getStatusNotice(status?: string | null) {
  switch (normalizeDocumentStatus(status)) {
    case 'FAILED':
      return '요약 작업이 실패한 문서입니다. 저장된 요약이 없을 수 있습니다.';
    case 'PROCESSING':
    case 'PENDING':
      return '요약 작업이 아직 진행 중입니다. 완료 후 다시 확인해주세요.';
    case 'REVIEW_REQUIRED':
      return 'OCR Markdown 검토가 필요한 문서입니다. 검토 후 요약을 진행할 수 있습니다.';
    default:
      return null;
  }
}

function getStatusBadgeClassName(status?: string | null) {
  switch (normalizeDocumentStatus(status)) {
    case 'FAILED':
      return 'border-red-500/20 bg-red-500/10 text-red-300';
    case 'PROCESSING':
    case 'PENDING':
      return 'border-blue-500/20 bg-blue-500/10 text-blue-300';
    case 'REVIEW_REQUIRED':
      return 'border-purple-500/20 bg-purple-500/10 text-purple-300';
    default:
      return 'border-green-500/20 bg-green-500/10 text-green-300';
  }
}

export function DocumentSummaryPage({ onBack, onLogout }: DocumentSummaryPageProps) {
  const navigate = useNavigate();
  const { documentId } = useParams();
  const [summaryData, setSummaryData] = useState<DocumentSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(documentId));
  const [error, setError] = useState<string | null>(documentId ? null : '문서 ID가 없습니다.');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!documentId) {
      return;
    }

    const loadSummary = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getDocumentSummary(documentId);
        setSummaryData(data);
      } catch (loadError) {
        setError(getErrorMessage(loadError));
      } finally {
        setIsLoading(false);
      }
    };

    void loadSummary();
  }, [documentId]);

  const summary = summaryData?.summary ?? '';
  const keywords = summaryData?.keywords ?? [];
  const statusNotice = summaryData ? getStatusNotice(summaryData.status) : null;
  const summaryStats = useMemo(() => {
    const words = summary.trim() ? summary.trim().split(/\s+/).length : 0;
    const lines = summary ? summary.split('\n').length : 0;

    return {
      characters: summary.length,
      lines,
      words,
    };
  }, [summary]);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    navigateBackOr(navigate);
  };

  const handleCopy = async () => {
    if (!summary) return;

    await navigator.clipboard.writeText(summary);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const handleDownload = () => {
    if (!summary || !summaryData) return;

    const blob = new Blob([summary], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${summaryData.file_name.replace(/\.pdf$/i, '')}-summary.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen w-full bg-[#0f0f17] text-white">
      <header className="sticky top-0 z-20 h-16 border-b border-white/10 bg-[#15151c]/90 backdrop-blur-xl">
        <div className="flex h-full items-center justify-between px-5 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              문서 목록
            </button>
            <div className="hidden h-5 w-px bg-white/10 sm:block" />
            <div className="hidden items-center gap-2 text-sm text-zinc-400 sm:flex">
              <Sparkles className="h-4 w-4 text-blue-300" />
              AI 생성 요약
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </button>
        </div>
      </header>

      <main className="p-5 lg:p-6">
        <div className="mx-auto max-w-[1280px] space-y-5">
          {isLoading && (
            <div className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4 text-blue-200">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>요약 결과를 불러오는 중입니다.</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-red-200">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          )}

          {statusNotice && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-amber-100">
              <AlertCircle className="h-5 w-5" />
              <span>{statusNotice}</span>
            </div>
          )}

          {summaryData && (
            <>
              <section className="rounded-lg border border-white/10 bg-[#15151c] p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex min-w-0 gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-blue-300/20 bg-blue-500/10">
                      <FileText className="h-6 w-6 text-blue-300" />
                    </div>
                    <div className="min-w-0">
                      <h1 className="truncate text-2xl font-bold text-white">{summaryData.file_name}</h1>
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-zinc-300">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-4 w-4" />
                          {formatDate(summaryData.upload_at)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <FileType className="h-4 w-4" />
                          {formatBytes(summaryData.file_size)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className={`inline-flex w-fit items-center gap-2 rounded-lg border px-3 py-1.5 ${getStatusBadgeClassName(summaryData.status)}`}>
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="text-sm font-medium">{summaryData.status}</span>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-blue-300" />
                      <h2 className="text-xl font-bold text-white">DB 저장 요약 결과</h2>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleCopy}
                        disabled={!summary}
                        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
                      >
                        {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        {copied ? '복사됨' : '복사'}
                      </button>
                      <button
                        type="button"
                        onClick={handleDownload}
                        disabled={!summary}
                        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/10 disabled:opacity-50"
                      >
                        <Download className="h-4 w-4" />
                        Markdown
                      </button>
                    </div>
                  </div>

                  <article className="rounded-lg border border-white/10 bg-[#15151c] p-6">
                    {summary ? (
                      <div className="leading-7 text-zinc-200">{renderSummary(summary)}</div>
                    ) : (
                      <div className="flex min-h-[320px] flex-col items-center justify-center text-center text-zinc-400">
                        <AlertCircle className="mb-3 h-9 w-9 text-zinc-500" />
                        <p className="font-medium text-zinc-200">저장된 요약 결과가 없습니다.</p>
                        <p className="mt-1 text-sm">요약 작업이 완료된 뒤 다시 확인해주세요.</p>
                      </div>
                    )}
                  </article>
                </div>

                <aside className="space-y-5">
                  <section className="rounded-lg border border-white/10 bg-[#15151c] p-5">
                    <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                      <Brain className="h-5 w-5 text-purple-300" />
                      AI 처리 정보
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <span className="text-zinc-400">사용 LLM</span>
                        <span className="font-medium text-white">{summaryData.llm_model ?? 'qwen3:4b'}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <span className="text-zinc-400">임베딩 모델</span>
                        <span className="font-medium text-white">{summaryData.embedding_model ?? '-'}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <span className="text-zinc-400">처리 완료</span>
                        <span className="font-medium text-white">{formatDate(summaryData.process_at)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">페이지</span>
                        <span className="font-medium text-white">{summaryData.page_count ?? 0}</span>
                      </div>
                    </div>
                  </section>

                  {keywords.length > 0 && (
                    <section className="rounded-lg border border-white/10 bg-[#15151c] p-5">
                      <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
                        <Tag className="h-5 w-5 text-blue-300" />
                        핵심 키워드
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {keywords.map((keyword) => (
                          <span
                            key={keyword}
                            className="rounded-lg border border-blue-300/20 bg-blue-500/10 px-3 py-1 text-sm text-blue-100"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}

                  <section className="rounded-lg border border-white/10 bg-[#15151c] p-5">
                    <h3 className="mb-4 text-lg font-semibold text-white">요약 통계</h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-lg bg-white/5 p-3 text-center">
                        <p className="text-lg font-bold text-white">{summaryStats.lines}</p>
                        <p className="mt-1 text-xs text-zinc-400">라인</p>
                      </div>
                      <div className="rounded-lg bg-white/5 p-3 text-center">
                        <p className="text-lg font-bold text-white">{summaryStats.words}</p>
                        <p className="mt-1 text-xs text-zinc-400">단어</p>
                      </div>
                      <div className="rounded-lg bg-white/5 p-3 text-center">
                        <p className="text-lg font-bold text-white">{summaryStats.characters}</p>
                        <p className="mt-1 text-xs text-zinc-400">문자</p>
                      </div>
                    </div>
                  </section>

                  <div className="grid grid-cols-1 gap-3">
                    <button
                      type="button"
                      onClick={() => documentId && navigate(`/documents/${documentId}/chat`)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
                    >
                      <MessageSquare className="h-4 w-4" />
                      문서 질문하기
                    </button>
                    <button
                      type="button"
                      onClick={() => documentId && navigate(`/documents/${documentId}/review`)}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/10"
                    >
                      <RefreshCw className="h-4 w-4" />
                      OCR Markdown 보기
                    </button>
                  </div>
                </aside>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
