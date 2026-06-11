import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Filter,
  Download,
  Trash2,
  RefreshCw,
  Eye,
  MoreVertical,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Brain,
  Sparkles,
  ChevronDown,
  Grid3x3,
  List,
  Calendar,
  FileType,
  Layers,
  TrendingUp,
  Activity
} from 'lucide-react';

interface Document {
  id: string;
  name: string;
  uploadDate: string;
  size: string;
  pages: number;
  status: 'ocr-processing' | 'summarizing' | 'embedding' | 'completed' | 'failed';
  category?: string;
  summary?: string;
  progress?: number;
}

interface DocumentListPageProps {
  onLogout?: () => void;
  onOpenSummary?: (id: string) => void;
  onOpenChat?: (id: string) => void;
}

export function DocumentListPage({ onLogout, onOpenSummary, onOpenChat }: DocumentListPageProps) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'processing' | 'completed' | 'failed'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'name'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get('status');
  
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


  const documents: Document[] = [
    {
      id: '1',
      name: '프로젝트_제안서_2024.pdf',
      uploadDate: '2024-05-27 14:30',
      size: '2.4 MB',
      pages: 15,
      status: 'completed',
      category: '제안서',
      summary: 'AI 문서 자동화 플랫폼 개발 프로젝트 제안서'
    },
    {
      id: '2',
      name: '계약서_검토본.pdf',
      uploadDate: '2024-05-27 13:15',
      size: '1.2 MB',
      pages: 8,
      status: 'summarizing',
      category: '계약서',
      progress: 65
    },
    {
      id: '3',
      name: '회의록_0515.pdf',
      uploadDate: '2024-05-27 12:00',
      size: '0.8 MB',
      pages: 3,
      status: 'completed',
      category: '회의록',
      summary: '주간 프로젝트 미팅 회의록'
    },
    {
      id: '4',
      name: '기술문서_API.pdf',
      uploadDate: '2024-05-27 11:45',
      size: '3.1 MB',
      pages: 22,
      status: 'ocr-processing',
      category: '기술문서',
      progress: 35
    },
    {
      id: '5',
      name: '보고서_Q1_2024.pdf',
      uploadDate: '2024-05-26 16:20',
      size: '4.5 MB',
      pages: 28,
      status: 'completed',
      category: '보고서',
      summary: '2024년 1분기 실적 보고서'
    },
    {
      id: '6',
      name: '사용자_매뉴얼.pdf',
      uploadDate: '2024-05-26 14:10',
      size: '1.8 MB',
      pages: 12,
      status: 'failed',
      category: '매뉴얼'
    }
  ];

  const getStatusConfig = (status: Document['status']) => {
    const configs = {
      'ocr-processing': {
        label: 'OCR 처리 중',
        icon: Loader2,
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        animate: true
      },
      'summarizing': {
        label: 'AI 요약 중',
        icon: Brain,
        color: 'text-purple-400',
        bgColor: 'bg-purple-500/10',
        borderColor: 'border-purple-500/20',
        animate: true
      },
      'embedding': {
        label: '임베딩 중',
        icon: Sparkles,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/20',
        animate: true
      },
      'completed': {
        label: '완료',
        icon: CheckCircle2,
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/20'
      },
      'failed': {
        label: '실패',
        icon: AlertCircle,
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20'
      }
    };
    return configs[status];
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.category?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =!statusParam || doc.status === statusParam;

    const matchesFilter =
      filterStatus === 'all' ? true :
      filterStatus === 'processing' ? ['ocr-processing', 'summarizing', 'embedding'].includes(doc.status) :
      filterStatus === 'completed' ? doc.status === 'completed' :
      filterStatus === 'failed' ? doc.status === 'failed' : true;

    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: documents.length,
    completed: documents.filter(d => d.status === 'completed').length,
    processing: documents.filter(d => ['ocr-processing', 'summarizing', 'embedding'].includes(d.status)).length,
    failed: documents.filter(d => d.status === 'failed').length
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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

        {/* Document List Content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">문서 관리</h2>
                <p className="text-zinc-300">총 {stats.total}개의 문서</p>
              </div>

            </div>

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-[#15151c] border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/20 border border-blue-300/30 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-200" />
                  </div>
                  <div>
                    <p className="text-zinc-300 text-sm">전체 문서</p>
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#15151c] border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-zinc-300 text-sm">처리 완료</p>
                    <p className="text-2xl font-bold text-white">{stats.completed}</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#15151c] border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  </div>
                  <div>
                    <p className="text-zinc-300 text-sm">처리 중</p>
                    <p className="text-2xl font-bold text-white">{stats.processing}</p>
                  </div>
                </div>
              </div>

              <div className="bg-[#15151c] border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-zinc-300 text-sm">실패</p>
                    <p className="text-2xl font-bold text-white">{stats.failed}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters and controls */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilterStatus('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filterStatus === 'all'
                      ? 'bg-primary text-white'
                      : 'bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  전체
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('processing')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filterStatus === 'processing'
                      ? 'bg-primary text-white'
                      : 'bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  처리 중
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('completed')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filterStatus === 'completed'
                      ? 'bg-primary text-white'
                      : 'bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  완료
                </button>
                <button
                  type="button"
                  onClick={() => setFilterStatus('failed')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    filterStatus === 'failed'
                      ? 'bg-primary text-white'
                      : 'bg-white/5 text-zinc-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  실패
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* View mode toggle */}
                <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'grid' ? 'bg-primary text-white' : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded transition-colors ${
                      viewMode === 'list' ? 'bg-primary text-white' : 'text-zinc-300 hover:text-white'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* Sort dropdown */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="recent">최신순</option>
                  <option value="oldest">오래된순</option>
                  <option value="name">이름순</option>
                </select>
              </div>
            </div>

            {/* Document list */}
            {filteredDocuments.length === 0 ? (
              // Empty state
              <div className="flex flex-col items-center justify-center py-20">
                <div className="p-6 bg-white/5 rounded-full mb-6">
                  <FileText className="w-12 h-12 text-zinc-400" />
                </div>
                <h3 className="text-white text-xl font-semibold mb-2">문서가 없습니다</h3>
                <p className="text-zinc-300 mb-6">아직 업로드한 문서가 없습니다</p>
                <button
                  type="button"
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-blue-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Upload className="w-5 h-5" />
                  <span className="font-medium">첫 문서 업로드하기</span>
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              // Grid view
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocuments.map((doc) => {
                  const statusConfig = getStatusConfig(doc.status);
                  const StatusIcon = statusConfig.icon;

                  return (
                    <div
                      key={doc.id}
                      className="relative group bg-[#15151c] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                            <FileText className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-medium text-sm mb-1 truncate">
                              {doc.name}
                            </h3>
                            <div className="flex items-center gap-2 text-xs text-zinc-300">
                              <Calendar className="w-3 h-3" />
                              <span>{doc.uploadDate}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/5 rounded transition-all"
                        >
                          <MoreVertical className="w-4 h-4 text-zinc-300" />
                        </button>
                      </div>

                      {/* Meta info */}
                      <div className="flex items-center gap-3 mb-4 text-xs text-zinc-300">
                        <span className="flex items-center gap-1">
                          <FileType className="w-3 h-3" />
                          {doc.size}
                        </span>
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          {doc.pages} 페이지
                        </span>
                      </div>

                      {/* Status */}
                      <div className="mb-4">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 ${statusConfig.bgColor} border ${statusConfig.borderColor} rounded-lg`}>
                          <StatusIcon className={`w-3.5 h-3.5 ${statusConfig.color} ${('animate' in statusConfig && statusConfig.animate) ? 'animate-spin' : ''}`} />
                          <span className={`text-xs font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
                        </div>

                        {doc.category && (
                          <span className="inline-flex items-center gap-1.5 ml-2 px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-zinc-200">
                            {doc.category}
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      {doc.progress !== undefined && doc.status !== 'completed' && (
                        <div className="mb-4">
                          <div className="w-full bg-white/5 rounded-full h-1.5">
                            <div
                              className="bg-gradient-to-r from-primary to-blue-500 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${doc.progress}%` }}
                            />
                          </div>
                          <p className="text-xs text-zinc-400 mt-1">{doc.progress}% 완료</p>
                        </div>
                      )}

                      {/* Summary preview */}
                      {doc.summary && (
                        <p className="text-zinc-300 text-sm mb-4 line-clamp-2">
                          {doc.summary}
                        </p>
                      )}

                      {/* Actions */}
                      {doc.status === 'completed' && (
                        <div className="flex items-center gap-2 pt-4 border-t border-white/10">
                          <button
                            type="button"
                            onClick={() => onOpenSummary?.(doc.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-xs text-zinc-200"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            요약
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenChat?.(doc.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-xs text-zinc-200"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            채팅
                          </button>
                          <button
                            type="button"
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                          >
                            <Download className="w-3.5 h-3.5 text-zinc-200" />
                          </button>
                        </div>
                      )}

                      {doc.status === 'failed' && (
                        <button
                          type="button"
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors text-sm text-red-400"
                        >
                          <RefreshCw className="w-4 h-4" />
                          재처리
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              // List view
              <div className="bg-[#15151c] border border-white/10 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-white/5 border-b border-white/10">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider">
                          문서명
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider">
                          업로드 시간
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider">
                          크기
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider">
                          페이지
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-300 uppercase tracking-wider">
                          상태
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-zinc-300 uppercase tracking-wider">
                          액션
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredDocuments.map((doc) => {
                        const statusConfig = getStatusConfig(doc.status);
                        const StatusIcon = statusConfig.icon;

                        return (
                          <tr key={doc.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                  <FileText className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                  <p className="text-white font-medium text-sm">{doc.name}</p>
                                  {doc.category && (
                                    <span className="inline-block px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-zinc-300 mt-1">
                                      {doc.category}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                              {doc.uploadDate}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                              {doc.size}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-300">
                              {doc.pages}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className={`inline-flex items-center gap-2 px-3 py-1 ${statusConfig.bgColor} border ${statusConfig.borderColor} rounded-lg`}>
                                <StatusIcon className={`w-3.5 h-3.5 ${statusConfig.color} ${('animate' in statusConfig && statusConfig.animate) ? 'animate-spin' : ''}`} />
                                <span className={`text-xs font-medium ${statusConfig.color}`}>{statusConfig.label}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2">
                                {doc.status === 'completed' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => onOpenSummary?.(doc.id)}
                                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                      title="요약 보기"
                                    >
                                      <Eye className="w-4 h-4 text-zinc-300" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onOpenChat?.(doc.id)}
                                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                      title="채팅"
                                    >
                                      <MessageSquare className="w-4 h-4 text-zinc-300" />
                                    </button>
                                    <button
                                      type="button"
                                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                      title="다운로드"
                                    >
                                      <Download className="w-4 h-4 text-zinc-300" />
                                    </button>
                                  </>
                                )}
                                {doc.status === 'failed' && (
                                  <button
                                    type="button"
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                    title="재처리"
                                  >
                                    <RefreshCw className="w-4 h-4 text-red-400" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                  <MoreVertical className="w-4 h-4 text-zinc-300" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
