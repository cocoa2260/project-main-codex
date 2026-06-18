import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  Bell,
  BookOpen,
  Bot,
  Calendar,
  ChevronLeft,
  ChevronsLeftRight,
  FileText,
  Layers,
  Loader2,
  LogOut,
  MessageSquare,
  Send,
  Sparkles,
  Tag,
} from 'lucide-react';

import { chatWithDocument, getDocumentSummary } from '../../api/document';
import { usePersistentSidebar } from '../../hooks/usePersistentSidebar';
import { PageTopNav } from '../../components/common/PageTopNav';
import { Sidebar } from '../../components/common/Sidebar';
import { StatusBadge } from '../../components/common/StatusBadge';
import type { DocumentChatCitation, DocumentSummaryResponse } from '../../types/document';
import { normalizeDocumentStatus } from '../../utils/documentStatus';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  citations?: DocumentChatCitation[];
}

interface DocumentChatPageProps {
  onBack?: () => void;
  onLogout?: () => void;
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

function formatBytes(bytes?: number | null) {
  if (!bytes) return '-';

  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatNow() {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string; message?: string } } }).response;
    return response?.data?.detail ?? response?.data?.message ?? '채팅 문서 정보를 불러오지 못했습니다.';
  }

  if (error instanceof Error) return error.message;

  return '채팅 문서 정보를 불러오지 못했습니다.';
}

function getChatErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string; message?: string } } }).response;
    return response?.data?.detail ?? response?.data?.message ?? '답변을 생성하지 못했습니다.';
  }

  if (error instanceof Error) return error.message;

  return '답변을 생성하지 못했습니다.';
}

function makeSuggestedQuestions(summaryData: DocumentSummaryResponse | null) {
  const keywords = summaryData?.keywords ?? [];
  const baseQuestions = [
    '이 문서의 핵심 내용을 요약해줘',
    '중요한 의사결정 포인트를 알려줘',
    '후속 액션이 필요한 부분을 찾아줘',
  ];

  if (keywords.length === 0) return baseQuestions;

  return [
    `${keywords[0]} 관련 내용을 설명해줘`,
    ...baseQuestions,
  ].slice(0, 4);
}

export function DocumentChatPage({ onBack, onLogout }: DocumentChatPageProps) {
  const navigate = useNavigate();
  const { documentId } = useParams();
  const [sidebarOpen, setSidebarOpen] = usePersistentSidebar();
  const [isDetailedView, setIsDetailedView] = useState(false);
  const [contextPanelExpanded, setContextPanelExpanded] = useState(true);
  const [message, setMessage] = useState('');
  const [summaryData, setSummaryData] = useState<DocumentSummaryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(documentId));
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(documentId ? null : '문서 ID가 없습니다.');
  const [chatError, setChatError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [introTimestamp] = useState(() => formatNow());
  const messageIdRef = useRef(0);

  useEffect(() => {
    if (!documentId) {
      return;
    }

    let isMounted = true;

    const loadSummary = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getDocumentSummary(documentId);
        if (isMounted) setSummaryData(data);
      } catch (loadError) {
        if (isMounted) setError(getErrorMessage(loadError));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadSummary();

    return () => {
      isMounted = false;
    };
  }, [documentId]);

  const normalizedStatus = normalizeDocumentStatus(summaryData?.status);
  const isChatPrepared = normalizedStatus === 'COMPLETED';
  const keywords = summaryData?.keywords ?? [];
  const suggestedQuestions = useMemo(() => makeSuggestedQuestions(summaryData), [summaryData]);
  const canSendMessage = Boolean(documentId) && isChatPrepared && !isSending && message.trim().length > 0;
  const visibleMessages = messages.length > 0
    ? messages
    : [
      {
        id: 'prepared',
        type: 'ai' as const,
        content: isChatPrepared
          ? '문서 컨텍스트를 불러왔습니다. 이 문서에 대해 질문해 주세요.'
          : '문서 처리가 완료되면 문서 기반 질문 기능을 사용할 수 있습니다.',
        timestamp: introTimestamp,
      },
    ];

  const sendQuestion = async (question: string) => {
    const trimmedQuestion = question.trim();
    if (!documentId || !trimmedQuestion || !isChatPrepared || isSending) return;

    const userMessage: Message = {
      id: `user-${messageIdRef.current += 1}`,
      type: 'user',
      content: trimmedQuestion,
      timestamp: formatNow(),
    };

    setMessages((currentMessages) => [...currentMessages, userMessage]);
    setMessage('');
    setIsSending(true);
    setChatError(null);

    try {
      const response = await chatWithDocument(documentId, { message: trimmedQuestion });
      const aiMessage: Message = {
        id: response.message_id ?? `ai-${messageIdRef.current += 1}`,
        type: 'ai',
        content: response.answer,
        timestamp: formatNow(),
        citations: response.citations,
      };
      setMessages((currentMessages) => [...currentMessages, aiMessage]);
    } catch (sendError) {
      setChatError(getChatErrorMessage(sendError));
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = () => {
    void sendQuestion(message);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    navigate('/documents');
  };

  const summaryPreview = summaryData?.summary?.trim() || '저장된 요약이 없습니다.';
  const showContextPanel = isDetailedView && contextPanelExpanded;

  return (
    <div className="min-h-screen w-full bg-[#0f0f17] flex">
      <Sidebar
        variant="user"
        sidebarOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((open) => !open)}
        onLogout={onLogout}
      />

      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        <PageTopNav
          onBack={handleBack}
          title="문서 채팅"
          description={summaryData?.file_name}
          rightActions={
            <>
            <button
              type="button"
              onClick={() => setIsDetailedView((current) => !current)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-100 transition-colors hover:bg-white/10 hover:text-white"
              aria-pressed={isDetailedView}
              title={isDetailedView ? '상세 보기 모드' : '간략 보기 모드'}
            >
              <ChevronsLeftRight className="h-4 w-4" />
              {isDetailedView ? '상세히 보기' : '간략히 보기'}
            </button>
            <div className="hidden md:flex min-w-0 items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
              <BookOpen className="w-4 h-4 shrink-0 text-primary" />
              <span className="truncate text-white text-sm font-medium">{summaryData?.file_name ?? '문서 채팅'}</span>
              <span className={`shrink-0 text-xs ${isChatPrepared ? 'text-emerald-300' : 'text-zinc-400'}`}>
                {isChatPrepared ? '질문 가능' : '처리 대기'}
              </span>
            </div>
            <button
              type="button"
              className="relative rounded-lg p-2 transition-colors hover:bg-white/5"
              title="알림 API 준비 중"
            >
              <Bell className="w-5 h-5 text-zinc-300" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-zinc-300 hover:text-white text-sm"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
            </>
          }
        />

        <main className="relative flex-1 flex overflow-hidden">
          <div className={`
            ${showContextPanel ? 'w-80' : 'w-0'}
            bg-[#15151c] border-r border-white/10 transition-all duration-300 overflow-hidden
            flex flex-col
          `}>
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-semibold">문서 정보</h3>
              <button
                type="button"
                onClick={() => setContextPanelExpanded(false)}
                className="p-1 hover:bg-white/5 rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-300" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {isLoading && (
                <div className="flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-sm text-blue-200">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  문서 정보를 불러오는 중입니다.
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-blue-500/20 border border-blue-300/30 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-200" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium text-sm mb-1 truncate">
                      {summaryData?.file_name ?? '문서 정보'}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-zinc-300">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(summaryData?.upload_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={summaryData?.status} size="sm" />
                  <div className="px-2 py-1 bg-white/5 rounded flex items-center gap-1.5">
                    <Layers className="w-3 h-3 text-zinc-300" />
                    <span className="text-zinc-300 text-xs">{summaryData?.page_count ?? 0} 페이지</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="mb-1 text-xs text-zinc-400">상태</p>
                  <StatusBadge status={summaryData?.status} size="sm" />
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="mb-1 text-xs text-zinc-400">파일 크기</p>
                  <p className="text-sm font-medium text-white">{formatBytes(summaryData?.file_size)}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="mb-1 text-xs text-zinc-400">업로드일</p>
                  <p className="text-sm font-medium text-white">{formatDate(summaryData?.upload_at)}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="mb-1 text-xs text-zinc-400">페이지 수</p>
                  <p className="text-sm font-medium text-white">{summaryData?.page_count ?? '-'}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <p className="mb-1 text-xs text-zinc-400">임베딩 모델</p>
                  <p className="break-words text-sm font-medium text-white">{summaryData?.embedding_model ?? '-'}</p>
                </div>
              </div>

              <div>
                <h4 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  요약
                </h4>
                <p className="text-zinc-300 text-sm leading-relaxed line-clamp-[12]">
                  {summaryPreview}
                </p>
              </div>

              {keywords.length > 0 && (
                <div>
                  <h4 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-primary" />
                    키워드
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((keyword) => (
                      <span
                        key={keyword}
                        className="px-2 py-1 bg-primary/10 border border-primary/20 text-primary rounded text-xs"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => navigate('/documents')}
                className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm transition-colors"
              >
                다른 문서 선택
              </button>
            </div>
          </div>

          {isDetailedView && !contextPanelExpanded && (
            <button
              type="button"
              onClick={() => setContextPanelExpanded(true)}
	              className="absolute left-0 top-6 z-10 inline-flex items-center gap-1 rounded-r-lg border border-white/10 bg-[#15151c] px-2 py-2 text-zinc-200 shadow-lg shadow-black/20 transition-colors hover:bg-white/10 hover:text-white"
                title="문서 정보 펼치기"
                aria-label="문서 정보 펼치기"
            >
              <ChevronLeft className="w-4 h-4 rotate-180 text-zinc-300" />
            </button>
          )}

          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-4xl mx-auto space-y-6">
                {visibleMessages.map((msg) => (
                  <div key={msg.id} className={msg.type === 'user' ? 'flex justify-end' : 'flex gap-3'}>
                    {msg.type === 'ai' && (
                      <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Bot className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div className={msg.type === 'user' ? 'max-w-[80%]' : 'flex-1 max-w-[85%]'}>
                      <div className={msg.type === 'user'
                        ? 'bg-gradient-to-r from-primary to-blue-500 text-white rounded-2xl rounded-tr-sm px-4 py-3'
                        : 'bg-[#15151c] border border-white/10 text-zinc-100 rounded-2xl rounded-tl-sm px-4 py-3'
                      }>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        {msg.type === 'ai' && msg.citations && (
                          <div className="mt-3 border-t border-white/10 pt-3">
                            <p className="mb-2 text-xs text-zinc-400">
                              {msg.citations.length > 0 ? '참조' : '참조 없음'}
                            </p>
                            {msg.citations.length > 0 && (
                              <div className="flex flex-wrap gap-2">
                                {msg.citations.map((citation) => (
                                  <span
                                    key={`${citation.source}-${citation.chunk_id ?? citation.label}`}
                                    className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-zinc-300"
                                  >
                                    {citation.label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <p className={`text-zinc-400 text-xs mt-1 ${msg.type === 'user' ? 'text-right' : ''}`}>
                        {msg.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
                {chatError && (
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                    <AlertCircle className="h-4 w-4" />
                    {chatError}
                  </div>
                )}
                {isSending && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-zinc-300">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    답변을 생성하는 중입니다.
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 pb-4">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span className="text-zinc-300 text-sm">추천 질문</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {suggestedQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => void sendQuestion(question)}
                      disabled={!isChatPrepared || isSending}
                      className="p-3 bg-white/5 border border-white/10 rounded-lg text-left transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <p className="text-zinc-200 text-sm">{question}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 p-4 bg-[#15151c]/50 backdrop-blur-xl">
              <div className="max-w-4xl mx-auto">
                <div className="relative">
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={isChatPrepared ? '문서에 대해 질문해 보세요' : '문서 처리가 완료되면 질문할 수 있습니다'}
                    rows={1}
                    disabled={!isChatPrepared || isSending}
                    className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-400 text-sm resize-none focus:outline-none focus:border-primary/60 disabled:opacity-60"
                    style={{
                      minHeight: '48px',
                      maxHeight: '200px',
                      height: 'auto',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!canSendMessage}
                    className="absolute right-2 bottom-2 p-2 bg-gradient-to-r from-primary to-blue-500 text-white rounded-lg disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-zinc-400 text-xs mt-2 text-center">
                  답변은 문서 요약, OCR Markdown, chunk 중 사용 가능한 컨텍스트를 기반으로 생성됩니다.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
