import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../../components/common/Sidebar';
import { StatusBadge } from '@/components/common/StatusBadge';
import {
  FileText,
  Upload,
  MessageSquare,
  Menu,
  X,
  Search,
  Bell,
  ChevronRight,
  TrendingUp,
  CheckCircle2,
  Loader2,
  Download,
  MoreVertical,
  Sparkles,
  Brain,
  Zap,
} from 'lucide-react';
import type { DocumentItem } from '@/types/document';
import { getDocuments } from '@/api/document';
import { getDocumentProgress } from '@/utils/documentStatus'
import { formatDateTime } from '@/utils/date'

interface DashboardPageProps {
  onLogout?: () => void;
}

export function DashboardPage({ onLogout }: DashboardPageProps) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [documents,setDocuments] = useState<DocumentItem[]>([])

  useEffect(() => {
    const loadDocuments = async () => {
      try {
        const docs = await getDocuments();
        setDocuments(docs);
      } catch (error) {
        console.error('문서 목록을 불러오는 중 오류 발생:', error);
      }
    }
    loadDocuments();
  }, []);

  const recentDocuments = documents.slice(0, 5).map((doc) => ({
    id: doc.id,
    name: doc.file_name,
    uploadDate: formatDateTime(doc.upload_at),
    status: doc.status,
    progress: getDocumentProgress(doc.status),
    pages: doc.page_count ?? 0,
    summary: doc.summary,
  }));

  // 문서 처리 현황 카운트
  const totalCount = documents.length;
  const pendingCount = documents.filter((doc) => doc.status === 'PENDING').length;
  const processingCount = documents.filter((doc) => doc.status === 'PROCESSING').length;
  const reviewRequiredCount = documents.filter((doc) => doc.status === 'REVIEW_REQUIRED').length;
  const completedCount = documents.filter((doc) => doc.status === 'COMPLETED').length;
  const getRatio = (count: number) => {
  if (totalCount === 0) return 0;
  return Math.round((count / totalCount) * 100);
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

            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="search"
                placeholder="문서 검색..."
                className="w-64 lg:w-96 pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
              />
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

        {/* Dashboard content */}
        <main className="flex-1 p-5 lg:p-6 overflow-auto">
          <div className="max-w-[1600px] mx-auto space-y-5">
            {/* Welcome section */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">대시보드</h2>
                <p className="text-zinc-300">AI 문서 처리 현황을 확인하세요</p>
              </div>

            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative group cursor-pointer">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-blue-500 rounded-xl opacity-0 group-hover:opacity-20 blur transition-opacity" />
                <div 
                  onClick={() => navigate('/documents')}
                  className="relative bg-[#15151c] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <FileText className="w-6 h-6 text-red-400" />
                    </div>
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-zinc-300 text-sm mb-1">총 문서 수</p>
                  <p className="text-3xl font-bold text-white mb-2">{totalCount}</p>
                  <p className="text-green-400 text-sm">+12% 이번 달</p>
                </div>
              </div>

              <div className="relative group cursor-pointer">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl opacity-0 group-hover:opacity-20 blur transition-opacity" />
                <div 
                  onClick={() => navigate('/documents?status=COMPLETED')}
                  className="relative bg-[#15151c] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-green-500/10 rounded-lg">
                      <CheckCircle2 className="w-6 h-6 text-green-400" />
                    </div>
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-zinc-300 text-sm mb-1">처리 완료</p>
                  <p className="text-3xl font-bold text-white mb-2">{completedCount}</p>
                  <p className="text-green-400 text-sm">전체의 {getRatio(completedCount)}%(+8% 이번 달)</p>
                </div>
              </div>

              <div className="relative group cursor-pointer">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl opacity-0 group-hover:opacity-20 blur transition-opacity" />
                <div 
                  onClick={() => navigate('/documents?status=PROCESSING')}
                  className="relative bg-[#15151c] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-blue-500/10 rounded-lg">
                      <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                    </div>
                  </div>
                  <p className="text-zinc-300 text-sm mb-1">처리 중</p>
                  <p className="text-3xl font-bold text-white mb-2">{pendingCount + processingCount + reviewRequiredCount}</p>
                  <p className="text-zinc-400 text-sm">실시간 처리</p>
                </div>
              </div>

              <div className="relative group cursor-pointer">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl opacity-0 group-hover:opacity-20 blur transition-opacity" />
                <div 
                  onClick={() => navigate('/documents')}
                  className="relative bg-[#15151c] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-purple-500/10 rounded-lg">
                      <Zap className="w-6 h-6 text-purple-400" />
                    </div>
                    <TrendingUp className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-zinc-300 text-sm mb-1">이번 주 처리</p>
                  <p className="text-3xl font-bold text-white mb-2">45</p>
                  <p className="text-green-400 text-sm">+23% 증가</p>
                </div>
              </div>
            </div>

            {/* Main content grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left column - Upload and Processing */}
              <div className="lg:col-span-2 space-y-6">
                {/* Drag & Drop Upload */}
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-blue-500 rounded-xl opacity-0 group-hover:opacity-30 blur transition-opacity" />
                  <div 
                    onClick={() => navigate('/documents')}
                    className="relative bg-[#15151c] border-2 border-dashed border-white/10 rounded-xl p-6 hover:border-primary/50 transition-all cursor-pointer"
                  >
                    <div className="flex flex-col items-center justify-center text-center">
                      <div className="p-4 bg-primary/10 rounded-full mb-4">
                        <Upload className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-white font-medium mb-2">PDF 문서를 여기에 드래그하세요</h3>
                      <p className="text-zinc-300 text-sm mb-4">또는 클릭하여 파일 선택 (최대 30MB)</p>
                      <button
                        type="button"
                        className="px-6 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors text-sm font-medium"
                      >
                        파일 선택
                      </button>
                    </div>
                  </div>
                </div>
                {/*                 
                <div className="bg-[#15151c] border border-[#2a2a35] rounded-2xl p-8">
                  <h3 className="text-xl font-semibold text-white mb-3">
                    새 문서 업로드
                  </h3>
                  <p className="text-[#a0a0ab] mb-6">
                    PDF 문서를 업로드하여 OCR, Markdown 검토,
                    AI 요약 및 문서 분석을 진행할 수 있습니다.
                  </p>
                  <button
                    onClick={() => navigate("/documents/upload")}
                    className="px-6 py-2.5 bg-white/5 border border-white/10 text-white rounded-lg hover:bg-white/10 transition-colors text-sm font-medium"
                  >
                    문서 업로드 시작
                  </button>
                </div>
                */}
                {/* Recent documents */}
                <div className="bg-[#15151c] border border-white/10 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white font-semibold text-lg">최근 문서</h3>
                    <button
                      type="button"
                      onClick={() => navigate('/documents')}
                      className="text-white hover:text-primary/80 text-sm font-medium flex items-center gap-1"
                    >
                      전체 보기
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {recentDocuments.map((doc) => {
                      return (
                        <div
                          key={doc.id}
                          className="p-4 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 hover:border-white/10 transition-all group cursor-pointer"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                              <FileText className="w-5 h-5 text-red-400" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h4 className="text-white font-medium text-sm truncate">{doc.name}</h4>
                                <button
                                  type="button"
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreVertical className="w-4 h-4 text-zinc-300" />
                                </button>
                              </div>

                              <div className="flex items-center gap-3 text-xs text-zinc-300 mb-3">
                                <span>{doc.uploadDate}</span>
                                {doc.pages && <span>• {doc.pages} 페이지</span>}
                              </div>

                              {/* Status */}
                              <div className="flex items-center gap-2 mb-2">
                                <StatusBadge status={doc.status} />
                              </div>

                              {/* Progress bar */}
                              {doc.status !== 'COMPLETED' && doc.status !== 'FAILED' && (
                                <div className="mb-2">
                                  <div className="w-full bg-white/5 rounded-full h-1.5">
                                    <div
                                      className="bg-gradient-to-r from-primary to-blue-500 h-1.5 rounded-full transition-all duration-500"
                                      style={{ width: `${doc.progress}%` }}
                                    />
                                  </div>
                                  <p className="text-xs text-zinc-400 mt-1">{doc.progress}% 완료</p>
                                </div>
                              )}

                              {doc.summary && (
                                <p className="text-zinc-300 text-sm line-clamp-1">{doc.summary}</p>
                              )}

                              {doc.status === 'COMPLETED' && (
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                                  <button
                                    type="button"
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-xs text-zinc-200"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    질문하기
                                  </button>
                                  <button
                                    type="button"
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-xs text-zinc-200"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    다운로드
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right column - Activity and Quick Actions */}
              <div className="space-y-6">
                {/* Processing pipeline */}
                <div className="bg-[#15151c] border border-white/10 rounded-xl p-5">
                  <h3 className="text-white font-semibold text-lg mb-4">AI 처리 파이프라인</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-500/10 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">PDF 업로드</p>
                        <p className="text-zinc-400 text-xs">완료</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">OCR 처리</p>
                        <p className="text-zinc-400 text-xs">진행 중... 65%</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/5 rounded-lg">
                        <Brain className="w-4 h-4 text-zinc-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-zinc-300 text-sm font-medium">AI 요약</p>
                        <p className="text-zinc-400 text-xs">대기 중</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/5 rounded-lg">
                        <Sparkles className="w-4 h-4 text-zinc-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-zinc-300 text-sm font-medium">벡터 임베딩</p>
                        <p className="text-zinc-400 text-xs">대기 중</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/5 rounded-lg">
                        <CheckCircle2 className="w-4 h-4 text-zinc-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-zinc-300 text-sm font-medium">완료</p>
                        <p className="text-zinc-400 text-xs">대기 중</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent activity */}
                <div className="bg-[#15151c] border border-white/10 rounded-xl p-5">
                  <h3 className="text-white font-semibold text-lg mb-4">최근 활동</h3>
                  <div className="space-y-4">
                    {recentDocuments.length === 0 ? (
                      <p className="rounded-lg bg-white/5 p-4 text-sm text-zinc-400">최근 문서 활동이 없습니다.</p>
                    ) : (
                      recentDocuments.slice(0, 4).map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => navigate(`/documents/${doc.id}/status`)}
                          className="flex w-full gap-3 rounded-lg text-left transition-colors hover:bg-white/5"
                        >
                          <div className="w-1.5 bg-primary rounded-full flex-shrink-0" />
                          <div className="flex-1 py-1 pr-2">
                            <p className="text-white text-sm mb-1 line-clamp-1">{doc.name}</p>
                            <p className="text-zinc-400 text-xs">{doc.status} · {doc.uploadDate}</p>
                          </div>
                        </button>
                      ))
                    )}
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
