import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Bot,
  FileText,
  Layers,
  Loader2,
  Send,
  Sparkles,
} from 'lucide-react';
import { usePersistentSidebar } from '../../hooks/usePersistentSidebar';
import { Sidebar } from '../../components/common/Sidebar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { chatWithDocument, getDocumentSummary } from '../../api/document';
import type { DocumentChatCitation, DocumentSummaryResponse } from '../../types/document';
import { normalizeDocumentStatus } from '../../utils/documentStatus';
import { navigateBackOr } from '../../utils/navigation';

interface DocumentWorkspacePageProps {
  onLogout?: () => void;
}

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
    return response?.data?.detail ?? response?.data?.message ?? '문서 정보를 불러오지 못했습니다.';
  }

  if (error instanceof Error) return error.message;

  return '문서 정보를 불러오지 못했습니다.';
}

function getChatErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string; message?: string } } }).response;
    return response?.data?.detail ?? response?.data?.message ?? '답변을 생성하지 못했습니다.';
  }

  if (error instanceof Error) return error.message;

  return '답변을 생성하지 못했습니다.';
}

export function DocumentWorkspacePage({ onLogout }: DocumentWorkspacePageProps) {
  const navigate = useNavigate();
  const { documentId } = useParams();
  const [sidebarOpen, setSidebarOpen] = usePersistentSidebar();
  const [message, setMessage] = useState('');
  const [summaryData, setSummaryData] = useState<DocumentSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(documentId));
  const [error, setError] = useState<string | null>(documentId ? null : '문서 ID가 없습니다.');
  const [answer, setAnswer] = useState<string | null>(null);
  const [citations, setCitations] = useState<DocumentChatCitation[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

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

  const normalizedStatus = normalizeDocumentStatus(summaryData?.status);
  const canAskQuestion = Boolean(documentId) && normalizedStatus === 'COMPLETED';

  const handleSend = async () => {
    const question = message.trim();
    if (!documentId || !question || !canAskQuestion || isSending) return;

    setIsSending(true);
    setChatError(null);

    try {
      const response = await chatWithDocument(documentId, { message: question });
      setAnswer(response.answer);
      setCitations(response.citations);
      setMessage('');
    } catch (sendError) {
      setChatError(getChatErrorMessage(sendError));
    } finally {
      setIsSending(false);
    }
  };

  const keywords = summaryData?.keywords ?? [];
  const summaryText = summaryData?.summary?.trim() || '저장된 요약이 없습니다.';
  const pageCount = summaryData?.page_count ?? null;
  const canOpenSummary = Boolean(documentId);
  const canSendMessage = canAskQuestion && !isSending && message.trim().length > 0;

  return (
    <div className="min-h-screen w-full bg-[#0f0f17] flex">
      <Sidebar
        sidebarOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((open) => !open)}
        onLogout={onLogout}
      />

      <main className="flex-1 p-5 lg:p-6 overflow-hidden">
          <div className="max-w-[1680px] mx-auto h-[calc(100vh-6.5rem)] grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-5">
            <section className="min-h-0 flex flex-col bg-[#15151c] border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-white/10 flex items-start justify-between gap-4">
	                <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => navigateBackOr(navigate)}
                      className="mb-3 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      돌아가기
                    </button>
	                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-white">{summaryData?.file_name ?? '문서 정보'}</h1>
                      <p className="text-sm text-zinc-400">
                        {pageCount ? `${pageCount} 페이지` : '페이지 정보 없음'} · {formatBytes(summaryData?.file_size)} · {summaryData?.llm_model ?? '요약 모델 정보 없음'}
                      </p>
                    </div>
                  </div>
                  {keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {keywords.map((keyword) => (
                        <span key={keyword} className="px-3 py-1 rounded-lg bg-blue-500/20 border border-blue-300/40 text-blue-100 text-xs font-medium">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
	                    onClick={() => documentId && navigate(`/documents/${documentId}/chat`)}
	                    disabled={!canOpenSummary}
                    className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm font-medium hover:bg-white/15 transition-colors"
                  >
	                    채팅 화면으로 보기
                  </button>
                  <StatusBadge status={summaryData?.status} />
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-auto p-6">
                <div className="max-w-4xl space-y-6">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold text-white">상세 분석</h2>
                  </div>
                  {isLoading && (
                    <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-4 text-zinc-300">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      문서 정보를 불러오는 중입니다.
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  )}

                  {!isLoading && !error && (
                    <article className="prose prose-invert max-w-none text-zinc-200 whitespace-pre-wrap leading-relaxed">
                      {summaryText}
                    </article>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                      <p className="text-zinc-400 text-sm mb-1">페이지 수</p>
                      <p className="text-white font-semibold">{pageCount ?? '-'}</p>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                      <p className="text-zinc-400 text-sm mb-1">업로드일</p>
                      <p className="text-white font-semibold">{formatDate(summaryData?.upload_at)}</p>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                      <p className="text-zinc-400 text-sm mb-1">임베딩 모델</p>
                      <p className="text-white font-semibold">{summaryData?.embedding_model ?? '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <aside className="min-h-0 flex flex-col bg-[#15151c] border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-500/10 rounded-xl">
                    <Bot className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-white font-bold">문서 기반 질문</h2>
                    <p className="text-sm text-zinc-400">
                      {canAskQuestion ? '문서 컨텍스트 기반 답변' : '완료된 문서만 질문 가능'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-auto p-5 space-y-4">
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <p className="text-zinc-200 text-sm leading-relaxed">
                    {answer ?? (canAskQuestion
                      ? '질문을 입력하면 이 영역에 문서 기반 답변이 표시됩니다.'
                      : '문서 처리가 완료되면 질문을 입력할 수 있습니다.')}
                  </p>
                </div>

                {isSending && (
                  <div className="flex items-center gap-2 rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4 text-sm text-blue-100">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    답변을 생성하는 중입니다.
                  </div>
                )}

                {chatError && (
                  <div className="flex items-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                    <AlertCircle className="h-4 w-4" />
                    {chatError}
                  </div>
                )}

                <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl">
                  <p className="text-white text-sm font-medium mb-2">참조 가능 정보</p>
                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                    <Layers className="w-4 h-4 text-primary" />
                    {citations.length > 0
                      ? citations.map((citation) => citation.label).join(', ')
                      : `${pageCount ? `Page 1-${pageCount}` : '페이지 정보 없음'} · 참조 없음`}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-white/10">
                <div className="flex items-end gap-2 rounded-2xl bg-white/5 border border-white/10 p-3 focus-within:ring-2 focus-within:ring-primary/40">
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        void handleSend();
                      }
                    }}
                    placeholder={canAskQuestion ? '문서에 대해 질문해 보세요' : '문서 처리가 완료되면 질문할 수 있습니다'}
                    rows={2}
                    disabled={!canAskQuestion || isSending}
                    className="flex-1 resize-none bg-transparent text-white placeholder-zinc-400 text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    className="p-2.5 rounded-xl bg-gradient-to-r from-primary to-blue-500 text-white hover:opacity-90 transition-opacity disabled:opacity-40"
                    disabled={!canSendMessage}
                  >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
  );
}
