import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Sidebar } from '../../components/common/Sidebar';
import { StatusBadge } from '@/components/common/StatusBadge';
import { getDocuments } from '@/api/document';
import { usePersistentSidebar } from '../../hooks/usePersistentSidebar';
import type { DocumentItem, DocumentStatus, TaskStage } from '@/types/document';
import { formatDateTime } from '@/utils/date';
import { getDocumentProgress, normalizeDocumentStatus } from '@/utils/documentStatus';
import {
  FileText,
  Upload,
  MessageSquare,
  Search,
  Bell,
  Download,
  RefreshCw,
  Eye,
  MoreVertical,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Brain,
  Grid3x3,
  List,
  Calendar,
  FileType,
  Layers,
  Activity,
  Trash2,
  LogOut,
} from 'lucide-react';

type SortBy = 'recent' | 'oldest' | 'name';
type FilterStatus = 'all' | 'processing' | 'completed' | 'failed';

interface Document {
  id: string;
  name: string;
  uploadDate: string;
  uploadedAtRaw: string;
  size: string;
  pages: number;
  status: DocumentStatus;
  stage?: TaskStage;
  category?: string;
  summary?: string;
  progress?: number;
}

interface DocumentListPageProps {
  onLogout?: () => void;
  onOpenSummary?: (id: string) => void;
  onOpenChat?: (id: string) => void;
}

function formatBytes(bytes?: number | null) {
  if (!bytes) return '-';

  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function getFilterStatusFromParam(statusParam: string | null): FilterStatus {
  const normalizedStatus = statusParam ? normalizeDocumentStatus(statusParam) : null;

  if (normalizedStatus === 'COMPLETED') return 'completed';
  if (normalizedStatus === 'FAILED') return 'failed';
  if (
    normalizedStatus === 'PENDING' ||
    normalizedStatus === 'PROCESSING' ||
    normalizedStatus === 'REVIEW_REQUIRED'
  ) {
    return 'processing';
  }

  return 'all';
}

export function DocumentListPage({ onLogout, onOpenSummary, onOpenChat }: DocumentListPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const statusParam = searchParams.get('status');
  const [sidebarOpen, setSidebarOpen] = usePersistentSidebar();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filterStatus = getFilterStatusFromParam(statusParam);
  
  useEffect(() => {
    let isMounted = true;

    const mapDocument = (doc: DocumentItem): Document => {
      const status = normalizeDocumentStatus(doc.status);

      return {
        id: doc.id,
        name: doc.file_name,
        uploadDate: formatDateTime(doc.upload_at),
        uploadedAtRaw: doc.upload_at,
        size: formatBytes(doc.file_size),
        pages: doc.page_count ?? 0,
        status,
        category: doc.category ?? undefined,
        summary: doc.summary ?? undefined,
        progress: getDocumentProgress(status),
      };
    };

    const loadDocuments = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const docs = await getDocuments();

        if (!isMounted) return;
        setDocuments(docs.map(mapDocument));
      } catch (loadError) {
        if (!isMounted) return;
        console.error('문서 목록을 불러오는 중 오류 발생:', loadError);
        setError('문서 목록을 불러오지 못했습니다.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadDocuments();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.category?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterStatus === 'all' ? true :
      filterStatus === 'processing' ? doc.status === 'PENDING' || doc.status === 'PROCESSING' || doc.status === 'REVIEW_REQUIRED' :
      filterStatus === 'completed' ? doc.status === 'COMPLETED' :
      filterStatus === 'failed' ? doc.status === 'FAILED' : true;

    return matchesSearch && matchesFilter;
  });

  const sortedDocuments = [...filteredDocuments].sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name, 'ko-KR');

    const aTime = new Date(a.uploadedAtRaw).getTime();
    const bTime = new Date(b.uploadedAtRaw).getTime();

    if (Number.isNaN(aTime) || Number.isNaN(bTime)) return 0;

    return sortBy === 'oldest' ? aTime - bTime : bTime - aTime;
  });

  const openDocumentDetail = (documentId: string) => navigate(`/documents/${documentId}`);
  const openDocumentStatus = (documentId: string) => navigate(`/documents/${documentId}/status`);
  const openDocumentWorkspace = (documentId: string) => navigate(`/documents/${documentId}/workspace`);
  const applyFilterStatus = (nextFilterStatus: FilterStatus) => {
    if (nextFilterStatus === 'completed') navigate('/documents?status=COMPLETED', { replace: true });
    else if (nextFilterStatus === 'processing') navigate('/documents?status=PROCESSING', { replace: true });
    else if (nextFilterStatus === 'failed') navigate('/documents?status=FAILED', { replace: true });
    else navigate('/documents', { replace: true });
  };

  const stats = {
    total: documents.length,
    completed: documents.filter(d => d.status === 'COMPLETED').length,
    processing: documents.filter(d => d.status === 'PENDING' || d.status === 'PROCESSING' || d.status === 'REVIEW_REQUIRED').length,
    failed: documents.filter(d => d.status === 'FAILED').length
  };

  return (
    <div className="min-h-screen w-full bg-[#0f0f17] flex">
      {/* Sidebar */}
      <Sidebar
        variant="user"
        sidebarOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((open) => !open)}
        onLogout={onLogout}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Top navigation */}
        <header className="h-16 bg-[#15151c]/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4">
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
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-zinc-300 hover:text-white text-sm"
            >
              <LogOut className="h-4 w-4" />
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
	                  onClick={() => applyFilterStatus('all')}
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
	                  onClick={() => applyFilterStatus('processing')}
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
	                  onClick={() => applyFilterStatus('completed')}
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
	                  onClick={() => applyFilterStatus('failed')}
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
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <option value="recent">최신순</option>
                  <option value="oldest">오래된순</option>
                  <option value="name">이름순</option>
                </select>
              </div>
            </div>

            {/* Document list */}
            {isLoading ? (
              <div className="flex items-center justify-center gap-3 py-20 text-zinc-300">
                <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                <span>문서 목록을 불러오는 중입니다.</span>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center gap-3 py-20 text-red-300">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span>{error}</span>
              </div>
            ) : filteredDocuments.length === 0 ? (
              // Empty state
              <div className="flex flex-col items-center justify-center py-20">
                <div className="p-6 bg-white/5 rounded-full mb-6">
                  <FileText className="w-12 h-12 text-zinc-400" />
                </div>
                <h3 className="text-white text-xl font-semibold mb-2">문서가 없습니다</h3>
                <p className="text-zinc-300 mb-6">아직 업로드한 문서가 없습니다</p>
                <button
                  type="button"
                  onClick={() => navigate('/documents/upload')}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary to-blue-500 text-white rounded-lg hover:opacity-90 transition-opacity"
                >
                  <Upload className="w-5 h-5" />
                  <span className="font-medium">첫 문서 업로드하기</span>
                </button>
              </div>
            ) : viewMode === 'grid' ? (
              // Grid view
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sortedDocuments.map((doc) => {
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
                          onClick={() => openDocumentDetail(doc.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/5 rounded transition-all"
                          title="문서 상세"
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
                        <StatusBadge status={doc.status} stage={doc.stage} />

                        {doc.category && (
                          <span className="inline-flex items-center gap-1.5 ml-2 px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-zinc-200">
                            {doc.category}
                          </span>
                        )}
                      </div>

                      {/* Progress bar */}
                      {doc.progress !== undefined && doc.status !== 'COMPLETED' && (
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
                      {doc.status !== 'COMPLETED' && doc.status !== 'REVIEW_REQUIRED' && doc.status !== 'FAILED' && (
                        <button
                          type="button"
                          onClick={() => openDocumentStatus(doc.id)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-colors text-sm text-blue-300"
                        >
                          <Activity className="w-4 h-4" />
                          처리 상태 보기
                        </button>
                      )}

                      {doc.status === 'REVIEW_REQUIRED' && (
                        <button
                          type="button"
                          onClick={() => navigate(`/documents/${doc.id}/review`)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg transition-colors text-sm text-purple-300"
                        >
                          <Eye className="w-4 h-4" />
                          검토하기
                        </button>
                      )}

                      {doc.status === 'COMPLETED' && (
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
                            onClick={() => openDocumentWorkspace(doc.id)}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                            title="워크스페이스"
                          >
                            <Brain className="w-3.5 h-3.5 text-zinc-200" />
                          </button>
                          <button
                            type="button"
                            disabled
                            title="사용자 원본 다운로드 API 준비 중"
                            className="p-2 bg-white/5 rounded-lg transition-colors opacity-40 cursor-not-allowed"
                          >
                            <Download className="w-3.5 h-3.5 text-zinc-200" />
                          </button>
                          <button
                            type="button"
                            disabled
                            title="사용자 문서 삭제 API 준비 중"
                            className="p-2 bg-red-500/10 rounded-lg transition-colors opacity-50 cursor-not-allowed"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-300" />
                          </button>
                        </div>
                      )}

                      {doc.status === 'FAILED' && (
                        <button
                          type="button"
                          disabled
                          title="사용자 재처리 API 준비 중"
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg transition-colors text-sm text-red-400 opacity-50 cursor-not-allowed"
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
                  <table className="w-full min-w-[920px] table-fixed">
                    <colgroup>
                      <col className="w-[34%]" />
                      <col className="w-[18%]" />
                      <col className="w-[10%]" />
                      <col className="w-[8%]" />
                      <col className="w-[14%]" />
                      <col className="w-[16%]" />
                    </colgroup>
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
                      {sortedDocuments.map((doc) => {
                        return (
                          <tr key={doc.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="shrink-0 p-2 bg-primary/10 rounded-lg">
                                  <FileText className="w-4 h-4 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-white font-medium text-sm" title={doc.name}>{doc.name}</p>
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
                              <StatusBadge status={doc.status} stage={doc.stage} size="sm" />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2">
                                {doc.status === 'COMPLETED' && (
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
                                      onClick={() => openDocumentWorkspace(doc.id)}
                                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                      title="워크스페이스"
                                    >
                                      <Brain className="w-4 h-4 text-zinc-300" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled
                                      className="p-2 rounded-lg opacity-40 cursor-not-allowed"
                                      title="사용자 원본 다운로드 API 준비 중"
                                    >
                                      <Download className="w-4 h-4 text-zinc-300" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled
                                      className="p-2 rounded-lg opacity-50 cursor-not-allowed"
                                      title="사용자 문서 삭제 API 준비 중"
                                    >
                                      <Trash2 className="w-4 h-4 text-red-300" />
                                    </button>
                                  </>
                                )}
                                {doc.status === 'REVIEW_REQUIRED' && (
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/documents/${doc.id}/review`)}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg transition-colors text-xs text-purple-300"
                                    title="검토하기"
                                  >
                                    <Eye className="w-4 h-4" />
                                    검토하기
                                  </button>
                                )}
                                {doc.status === 'FAILED' && (
                                  <button
                                    type="button"
                                    disabled
                                    className="p-2 rounded-lg opacity-40 cursor-not-allowed"
                                    title="사용자 재처리 API 준비 중"
                                  >
                                    <RefreshCw className="w-4 h-4 text-red-400" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openDocumentDetail(doc.id)}
                                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                  title="문서 상세"
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
