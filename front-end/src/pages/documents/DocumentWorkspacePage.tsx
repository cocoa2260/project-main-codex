import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Bell,
  Bot,
  CheckCircle2,
  ChevronLeft,
  FileText,
  Home,
  Layers,
  Menu,
  Search,
  Send,
  Settings,
  Shield,
  Sparkles,
  Upload,
  User,
  X,
} from 'lucide-react';
import { VIEW_TEXT } from '../../constants/text';
import { Sidebar } from '../../components/common/Sidebar';

interface DocumentWorkspacePageProps {
  onLogout?: () => void;
}

const summaryText = `# 프로젝트 개요

이 문서는 생성형 AI 문서 자동화 플랫폼 구축을 위한 제안서입니다. PDF 업로드, OCR 텍스트 추출, AI 요약, 벡터 임베딩, RAG 기반 질의응답 흐름을 하나의 웹 서비스로 제공하는 것을 목표로 합니다.

## 핵심 기능

- PDF 문서 업로드 및 처리 상태 추적
- OCR 결과를 Markdown으로 변환하고 사용자 검수
- LLM 기반 문서 요약 생성
- 문서별 RAG 채팅 제공
- 관리자 작업 모니터링 및 실패 작업 관리

## 기대 효과

문서 검토 시간을 줄이고, 업로드된 문서를 기반으로 빠르게 질문하고 답변을 확인할 수 있습니다.`;

const suggestedQuestions = [
  '이 문서의 핵심 목적은 뭐야?',
  '기술 스택을 표로 정리해줘',
  '프로젝트 리스크를 알려줘',
  '발표용으로 3줄 요약해줘',
];

export function DocumentWorkspacePage({ onLogout }: DocumentWorkspacePageProps) {
  const navigate = useNavigate();
  const { documentId = 'demo' } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [message, setMessage] = useState('');

  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: Home },
    { id: 'documents', label: '문서 관리', icon: FileText },
    { id: 'settings', label: '설정', icon: Settings },
    { id: 'admin', label: '관리자', icon: Shield, badge: 'Pro' },
  ];

  const userMenuRoutes: Record<string, string> = {
    dashboard: '/dashboard',
    documents: '/documents',
    settings: '/dashboard',
    admin: '/admin',
  };

  const handleMenuClick = (menuId: string) => {
    const route = userMenuRoutes[menuId];
    if (route) navigate(route);
  };

  const handleSend = () => {
    if (!message.trim()) return;
    setMessage('');
  };

  return (
    <div className="min-h-screen w-full bg-[#0f0f17] flex">
      <Sidebar
        sidebarOpen={sidebarOpen}
        onLogout={onLogout}
      />

      <main className="flex-1 p-5 lg:p-6 overflow-hidden">
          <div className="max-w-[1680px] mx-auto h-[calc(100vh-6.5rem)] grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-5">
            <section className="min-h-0 flex flex-col bg-[#15151c] border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-white/10 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-white">프로젝트_제안서_2024.pdf</h1>
                      <p className="text-sm text-zinc-400">15 페이지 · 2.4 MB · Gemma 2B 요약</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {['AI 문서 자동화', 'OCR', 'RAG', 'FastAPI', 'Ollama'].map((keyword) => (
                      <span key={keyword} className="px-3 py-1 rounded-lg bg-blue-500/20 border border-blue-300/40 text-blue-100 text-xs font-medium">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate(`/documents/${documentId}/summary`)}
                    className="px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm font-medium hover:bg-white/15 transition-colors"
                  >
                    {VIEW_TEXT.SIMPLE_VIEW}
                  </button>
                  <div className="px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 text-sm font-medium">처리 완료</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-auto p-6">
                <div className="max-w-4xl space-y-6">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    <h2 className="text-xl font-bold text-white">상세 분석</h2>
                  </div>
                  <article className="prose prose-invert max-w-none text-zinc-200 whitespace-pre-wrap leading-relaxed">
                    {summaryText}
                  </article>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-4">
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                      <p className="text-zinc-400 text-sm mb-1">주요 페이지</p>
                      <p className="text-white font-semibold">1, 3-5, 8, 12</p>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                      <p className="text-zinc-400 text-sm mb-1">텍스트 추출률</p>
                      <p className="text-green-400 font-semibold">98%</p>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                      <p className="text-zinc-400 text-sm mb-1">임베딩 모델</p>
                      <p className="text-white font-semibold">nomic-embed-text</p>
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
                    <p className="text-sm text-zinc-400">요약을 보면서 바로 질문하세요</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 min-h-0 overflow-auto p-5 space-y-4">
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <p className="text-zinc-200 text-sm leading-relaxed">
                    이 문서에 대해 궁금한 내용을 질문해 주세요. 답변에는 관련 페이지와 근거를 함께 표시할 수 있습니다.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {suggestedQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => setMessage(question)}
                      className="text-left p-3 rounded-xl bg-white/5 border border-white/10 text-zinc-200 text-sm hover:bg-white/10 transition-colors"
                    >
                      {question}
                    </button>
                  ))}
                </div>

                <div className="p-4 bg-primary/10 border border-primary/20 rounded-2xl">
                  <p className="text-white text-sm font-medium mb-2">참조 가능 정보</p>
                  <div className="flex items-center gap-2 text-sm text-zinc-300">
                    <Layers className="w-4 h-4 text-primary" />
                    Page 1-15 · 32 chunks · RAG 준비 완료
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-white/10">
                <div className="flex items-end gap-2 rounded-2xl bg-white/5 border border-white/10 p-3 focus-within:ring-2 focus-within:ring-primary/40">
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="이 문서에 대해 질문하세요..."
                    rows={2}
                    className="flex-1 resize-none bg-transparent text-white placeholder-zinc-400 text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    className="p-2.5 rounded-xl bg-gradient-to-r from-primary to-blue-500 text-white hover:opacity-90 transition-opacity disabled:opacity-40"
                    disabled={!message.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </main>
      </div>
  );
}
