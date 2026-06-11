import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../../components/common/Sidebar';
import {
  Home,
  FileText,
  Upload,
  MessageSquare,
  Clock,
  Settings,
  Shield,
  Menu,
  X,
  Search,
  Bell,
  User,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Send,
  Copy,
  RefreshCw,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  ExternalLink,
  BookOpen,
  Zap,
  Tag,
  TrendingUp,
  Bot,
  Loader2
} from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: string;
  sources?: {
    page: number;
    excerpt: string;
    confidence: number;
  }[];
}

interface DocumentChatPageProps {
  onBack?: () => void;
  onLogout?: () => void;
}

export function DocumentChatPage({ onBack, onLogout }: DocumentChatPageProps) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [contextPanelExpanded, setContextPanelExpanded] = useState(true);
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'ai',
      content: '안녕하세요! 프로젝트_제안서_2024.pdf 문서에 대해 질문해주세요. 문서 내용을 기반으로 정확한 답변을 드리겠습니다.',
      timestamp: '14:30',
      sources: []
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const menuItems = [
    { id: 'dashboard', label: '대시보드', icon: Home },
    { id: 'documents', label: '문서 관리', icon: FileText },
    { id: 'settings', label: '설정', icon: Settings },
    { id: 'admin', label: '관리자', icon: Shield, badge: 'Pro' }
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
  const documentInfo = {
    name: '프로젝트_제안서_2024.pdf',
    uploadDate: '2024-05-27 14:30',
    pages: 15,
    status: 'completed',
    summary: 'AI 문서 자동화 플랫폼 개발 프로젝트 제안서입니다. OCR, LLM, RAG 기술을 활용한 문서 처리 시스템 구축을 목표로 합니다.',
    keywords: ['AI 문서 자동화', 'OCR', 'LLM', 'RAG', 'FastAPI']
  };

  const suggestedQuestions = [
    '이 프로젝트의 주요 목표가 뭐야?',
    '사용하는 기술 스택 알려줘',
    '예상 개발 기간은 얼마나 돼?',
    '핵심 기능을 요약해줘'
  ];

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: '이 프로젝트의 주요 목표는 생성형 AI 기술을 활용하여 PDF 문서의 업로드부터 OCR 처리, 자동 요약, 스마트 분류, 그리고 RAG 기반 질의응답까지 통합된 문서 자동화 플랫폼을 구축하는 것입니다.\n\n구체적으로는:\n\n1. **OCR 기반 텍스트 추출**: PDF 문서에서 자동으로 텍스트를 추출하여 디지털화합니다.\n\n2. **AI 자동 요약**: 로컬 LLM(Ollama/Gemma)을 활용하여 문서를 자동으로 요약하고 핵심 내용을 추출합니다.\n\n3. **스마트 자동 분류**: AI가 문서 유형을 판단하여 자동으로 카테고리를 분류합니다.\n\n4. **RAG 기반 질의응답**: 업로드된 문서를 기반으로 사용자 질문에 정확한 답변을 제공합니다.\n\n이를 통해 문서 처리 시간을 80% 단축하고, 업무 생산성을 3배 향상시키는 것을 목표로 하고 있습니다.',
        timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        sources: [
          {
            page: 1,
            excerpt: '본 프로젝트는 생성형 AI 기술을 활용하여 문서 처리 업무를 자동화하는 웹 기반 SaaS 플랫폼 구축을 목표로 합니다.',
            confidence: 0.95
          },
          {
            page: 3,
            excerpt: 'OCR 기반 텍스트 추출, AI 자동 요약, 스마트 자동 분류, RAG 기반 질의응답 기능을 제공합니다.',
            confidence: 0.92
          },
          {
            page: 12,
            excerpt: '문서 처리 시간 80% 단축, 업무 생산성 3배 향상을 목표로 합니다.',
            confidence: 0.88
          }
        ]
      };
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setMessage(question);
  };

  return (
    <div className="min-h-screen w-full bg-[#0f0f17] flex">
      {/* Sidebar */}
      <Sidebar
        variant="user"
        sidebarOpen={sidebarOpen}
        onLogout={onLogout}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Top navigation */}
        <header className="h-16 bg-[#15151c]/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors lg:hidden"
            >
              {sidebarOpen ? <X className="w-5 h-5 text-zinc-300" /> : <Menu className="w-5 h-5 text-zinc-300" />}
            </button>

            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-zinc-300" />
              <span className="text-zinc-300 text-sm">돌아가기</span>
            </button>

            {/* Current document indicator */}
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/5 border border-white/10 rounded-lg">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="text-white text-sm font-medium">{documentInfo.name}</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400 text-xs">AI 준비됨</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="p-2 hover:bg-white/5 rounded-lg transition-colors relative"
            >
              <Bell className="w-5 h-5 text-zinc-300" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-zinc-300 hover:text-white text-sm"
            >
              로그아웃
            </button>
          </div>
        </header>

        {/* Chat layout */}
        <main className="flex-1 flex overflow-hidden">
          {/* Document Context Panel */}
          <div className={`
            ${contextPanelExpanded ? 'w-80' : 'w-0'}
            bg-[#15151c] border-r border-white/10 transition-all duration-300 overflow-hidden
            flex flex-col
          `}>
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-semibold">문서 정보</h3>
              <button
                type="button"
                onClick={() => setContextPanelExpanded(!contextPanelExpanded)}
                className="p-1 hover:bg-white/5 rounded transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-300" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
              {/* Document card */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-blue-500/20 border border-blue-300/30 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-200" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium text-sm mb-1 truncate">
                      {documentInfo.name}
                    </h4>
                    <div className="flex items-center gap-2 text-xs text-zinc-300">
                      <Calendar className="w-3 h-3" />
                      <span>{documentInfo.uploadDate}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <div className="px-2 py-1 bg-green-500/10 border border-green-500/20 rounded flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                    <span className="text-green-400 text-xs">완료</span>
                  </div>
                  <div className="px-2 py-1 bg-white/5 rounded flex items-center gap-1.5">
                    <Layers className="w-3 h-3 text-zinc-300" />
                    <span className="text-zinc-300 text-xs">{documentInfo.pages} 페이지</span>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div>
                <h4 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  요약
                </h4>
                <p className="text-zinc-300 text-sm leading-relaxed">
                  {documentInfo.summary}
                </p>
              </div>

              {/* Keywords */}
              <div>
                <h4 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" />
                  키워드
                </h4>
                <div className="flex flex-wrap gap-2">
                  {documentInfo.keywords.map((keyword) => (
                    <span
                      key={keyword}
                      className="px-2 py-1 bg-primary/10 border border-primary/20 text-primary rounded text-xs"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div>
                <h4 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  처리 정보
                </h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-300">OCR 완료</span>
                    <span className="text-green-400">100%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-300">임베딩</span>
                    <span className="text-green-400">완료</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-300">RAG 준비</span>
                    <span className="text-green-400">준비됨</span>
                  </div>
                </div>
              </div>

              {/* Change document */}
              <button
                type="button"
                className="w-full py-2 px-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white text-sm transition-colors"
              >
                다른 문서 선택
              </button>
            </div>
          </div>

          {/* Collapse button when panel is closed */}
          {!contextPanelExpanded && (
            <button
              type="button"
              onClick={() => setContextPanelExpanded(true)}
              className="absolute left-0 top-24 z-10 p-2 bg-[#15151c] border border-white/10 rounded-r-lg hover:bg-white/5 transition-colors"
            >
              <ChevronDown className="w-4 h-4 text-zinc-300 rotate-90" />
            </button>
          )}

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.map((msg) => (
                  <div key={msg.id}>
                    {msg.type === 'user' ? (
                      <div className="flex justify-end">
                        <div className="max-w-[80%]">
                          <div className="bg-gradient-to-r from-primary to-blue-500 text-white rounded-2xl rounded-tr-sm px-4 py-3">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          <p className="text-zinc-400 text-xs mt-1 text-right">{msg.timestamp}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 max-w-[85%]">
                          <div className="bg-[#15151c] border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
                            <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">
                              {msg.content}
                            </p>

                            {/* Sources */}
                            {msg.sources && msg.sources.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-white/10">
                                <div className="flex items-center gap-2 mb-3">
                                  <ExternalLink className="w-4 h-4 text-primary" />
                                  <span className="text-primary text-xs font-medium">출처 정보</span>
                                </div>
                                <div className="space-y-2">
                                  {msg.sources.map((source, idx) => (
                                    <div
                                      key={idx}
                                      className="p-3 bg-white/5 border border-white/10 rounded-lg hover:border-primary/30 transition-colors cursor-pointer group"
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <div className="px-2 py-0.5 bg-primary/20 text-primary rounded text-xs font-medium">
                                            Page {source.page}
                                          </div>
                                          <div className="flex items-center gap-1">
                                            {[...Array(5)].map((_, i) => (
                                              <div
                                                key={i}
                                                className={`w-1 h-1 rounded-full ${
                                                  i < Math.floor(source.confidence * 5)
                                                    ? 'bg-green-400'
                                                    : 'bg-gray-600'
                                                }`}
                                              />
                                            ))}
                                            <span className="text-zinc-300 text-xs ml-1">
                                              {Math.round(source.confidence * 100)}%
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                      <p className="text-zinc-300 text-xs leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">
                                        "{source.excerpt}"
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              type="button"
                              className="p-1.5 hover:bg-white/5 rounded transition-colors group"
                              title="답변 복사"
                            >
                              <Copy className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200" />
                            </button>
                            <button
                              type="button"
                              className="p-1.5 hover:bg-white/5 rounded transition-colors group"
                              title="다시 생성"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200" />
                            </button>
                            <span className="text-zinc-400 text-xs ml-auto">{msg.timestamp}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing indicator */}
                {isTyping && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Loader2 className="w-5 h-5 text-white animate-spin" />
                    </div>
                    <div className="bg-[#15151c] border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Suggested questions */}
            {messages.length === 1 && (
              <div className="px-6 pb-4">
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-primary" />
                    <span className="text-zinc-300 text-sm">추천 질문</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {suggestedQuestions.map((question, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSuggestedQuestion(question)}
                        className="p-3 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-primary/30 transition-all text-left group"
                      >
                        <p className="text-zinc-200 text-sm group-hover:text-white transition-colors">
                          {question}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Input area */}
            <div className="border-t border-white/10 p-4 bg-[#15151c]/50 backdrop-blur-xl">
              <div className="max-w-4xl mx-auto">
                <div className="relative">
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="문서에 대해 질문하세요... (Enter로 전송, Shift+Enter로 줄바꿈)"
                    rows={1}
                    className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-400 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
                    style={{
                      minHeight: '48px',
                      maxHeight: '200px',
                      height: 'auto'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleSendMessage}
                    disabled={!message.trim()}
                    className="absolute right-2 bottom-2 p-2 bg-gradient-to-r from-primary to-blue-500 text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-zinc-400 text-xs mt-2 text-center">
                  AI가 문서 내용을 기반으로 답변합니다. 정확도를 위해 출처를 확인해주세요.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
