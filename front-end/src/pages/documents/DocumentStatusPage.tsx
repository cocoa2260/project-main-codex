import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Home,
  FileText,
  MessageSquare,
  Clock,
  Settings,
  Shield,
  Menu,
  X,
  Bell,
  User,
  ChevronLeft,
  CheckCircle2,
  Loader2,
  AlertCircle,
  XCircle,
  Eye,
  Download,
  Database,
  Zap,
  Calendar,
  FileType,
  Layers,
  Activity,
  TrendingUp,
  PlayCircle,
  PauseCircle
} from 'lucide-react';
import { useDocumentStatus } from '../../hooks/useDocumentStatus';
import { Sidebar } from '../../components/common/Sidebar';
import { PipelineStepper } from '../../components/document/PipelineStepper';

interface ActivityLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface DocumentStatusPageProps {
  onBack?: () => void;
  onLogout?: () => void;
  onOpenSummary?: () => void;
  onOpenChat?: () => void;
}

export function DocumentStatusPage({ onBack, onLogout, onOpenSummary, onOpenChat }: DocumentStatusPageProps) {
  const navigate = useNavigate();
  const { documentId } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const {
    status,
    activityLog,
    isConnected,
    isLoading,
    error,
    progress,
    normalizedStatus,
    currentStageLabel,
  } = useDocumentStatus(documentId);

  const isProcessing = normalizedStatus === 'PENDING' || normalizedStatus === 'PROCESSING';
  const isReviewRequired = normalizedStatus === 'REVIEW_REQUIRED';
  const isFailed = normalizedStatus === 'FAILED';
  const isCompleted = normalizedStatus === 'COMPLETED';

  useEffect(() => {
    if (!documentId || normalizedStatus !== 'REVIEW_REQUIRED') return;

    navigate(`/documents/${documentId}/review`);
  }, [documentId, navigate, normalizedStatus]);

  const documentInfo = {
    name: status?.document_id ? `문서 ${status.document_id.slice(0, 8)}` : '업로드 문서',
    uploadDate: '처리 상태 조회 중',
    size: '-',
    pages: '-',
  };

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

  const getActivityIcon = (type: ActivityLog['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-3 h-3 text-green-400" />;
      case 'error':
        return <XCircle className="w-3 h-3 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-3 h-3 text-yellow-400" />;
      default:
        return <Activity className="w-3 h-3 text-blue-400" />;
    }
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

        {/* Status content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-6xl mx-auto space-y-6">
            {isLoading && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-blue-300 flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>문서 처리 상태를 불러오는 중입니다.</span>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-300 flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}
            {/* Document header */}
            <div className="bg-[#15151c] border border-white/10 rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white mb-2">{documentInfo.name}</h1>
                    <div className="flex items-center gap-4 text-sm text-zinc-300">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        {documentInfo.uploadDate}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <FileType className="w-4 h-4" />
                        {documentInfo.size}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-4 h-4" />
                        {documentInfo.pages} 페이지
                      </span>
                    </div>
                  </div>
                </div>

                {isReviewRequired ? (
                  <div className="px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg flex items-center gap-2">
                    <Eye className="w-4 h-4 text-purple-400" />
                    <span className="text-purple-400 text-sm font-medium">검토 대기</span>
                  </div>
                ) : isFailed ? (
                  <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-red-400 text-sm font-medium">실패</span>
                  </div>
                ) : isProcessing ? (
                  <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    <span className="text-blue-400 text-sm font-medium">처리 중</span>
                  </div>
                ) : (
                  <div className="px-4 py-2 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-green-400 text-sm font-medium">완료</span>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main progress area */}
              <div className="lg:col-span-2 space-y-6">
                {/* Large progress indicator */}
                <div className="relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-blue-500 rounded-xl opacity-20 blur" />
                  <div className="relative bg-[#15151c] border border-white/10 rounded-xl p-8">
                    <div className="text-center mb-8">
                      <div className="relative inline-flex items-center justify-center mb-6">
                        {/* Outer ring */}
                        <svg className="w-48 h-48 transform -rotate-90">
                          <circle
                            cx="96"
                            cy="96"
                            r="88"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            className="text-white/5"
                          />
                          <circle
                            cx="96"
                            cy="96"
                            r="88"
                            stroke="url(#gradient)"
                            strokeWidth="8"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 88}`}
                            strokeDashoffset={`${2 * Math.PI * 88 * (1 - progress / 100)}`}
                            className="transition-all duration-500"
                          />
                          <defs>
                            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#3b82f6" />
                              <stop offset="100%" stopColor="#8b5cf6" />
                            </linearGradient>
                          </defs>
                        </svg>

                        {/* Center content */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <div className="text-6xl font-bold text-white mb-2">{progress}%</div>
                          <div className="text-zinc-300 text-sm">{currentStageLabel}</div>
                        </div>
                      </div>

                      {isProcessing && (
                        <div className="flex items-center justify-center gap-2 text-sm text-zinc-300">
                          <Clock className="w-4 h-4" />
                          <span>{isConnected ? '실시간 상태 수신 중' : '상태 조회 중'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Processing pipeline */}
                <div className="bg-[#15151c] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-6">처리 단계</h3>
                  <PipelineStepper
                    status={status?.status ?? normalizedStatus}
                    stage={status?.stage}
                    progress={progress}
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                  {isProcessing ? (
                    <>
                      <button
                        type="button"
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <PauseCircle className="w-4 h-4" />
                        <span className="font-medium">백그라운드로 전환</span>
                      </button>
                      <button
                        type="button"
                        className="px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors font-medium"
                      >
                        취소
                      </button>
                    </>
                  ) : isCompleted ? (
                    <>
                      <button
                        type="button"
                        onClick={onOpenSummary}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary to-blue-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                      >
                        <Eye className="w-4 h-4" />
                        <span className="font-medium">요약 보기</span>
                      </button>
                      <button
                        type="button"
                        onClick={onOpenChat}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span className="font-medium">채팅 시작</span>
                      </button>
                      <button
                        type="button"
                        className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                    </>
                  ) : (
                    null
                  )}
                </div>
              </div>

              {/* Right panel */}
              <div className="space-y-6">
                {/* Processing details */}
                <div className="bg-[#15151c] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    처리 정보
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b border-white/10">
                      <span className="text-zinc-300 text-sm">현재 작업</span>
                      <span className="text-white font-medium text-sm">{currentStageLabel}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-white/10">
                      <span className="text-zinc-300 text-sm">처리 속도</span>
                      <span className="text-white font-medium text-sm">1.2 페이지/초</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-white/10">
                      <span className="text-zinc-300 text-sm">추출된 페이지</span>
                      <span className="text-white font-medium text-sm">{progress}%</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-white/10">
                      <span className="text-zinc-300 text-sm">OCR 정확도</span>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 w-20 bg-white/5 rounded-full h-1.5">
                          <div className="bg-green-400 h-1.5 rounded-full" style={{ width: '97%' }} />
                        </div>
                        <span className="text-green-400 font-medium text-sm">97%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-zinc-300 text-sm">작업 큐</span>
                      <span className="text-white font-medium text-sm">2개 대기 중</span>
                    </div>
                  </div>
                </div>

                {/* Live activity */}
                <div className="bg-[#15151c] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    실시간 활동
                  </h3>
                  <div className="space-y-3 max-h-96 overflow-auto">
                    {activityLog.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <div className="mt-0.5">
                          {getActivityIcon(log.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-zinc-200 text-sm">{log.message}</p>
                          <p className="text-zinc-400 text-xs mt-1">{log.timestamp}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* System status */}
                <div className="bg-[#15151c] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    시스템 상태
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-zinc-300 text-sm">Worker 사용률</span>
                        <span className="text-white text-sm">3 / 5</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '60%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-zinc-300 text-sm">처리 큐</span>
                        <span className="text-white text-sm">2 대기</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '40%' }} />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-green-400 text-sm">모든 시스템 정상</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
