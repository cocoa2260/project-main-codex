import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  deleteAdminDocument,
  downloadAdminDocumentOriginal,
  getAdminCategoryStats,
  getAdminDocumentDetail,
  getAdminDocuments,
  retryAdminDocumentFromStage,
} from '../../api/admin';
import { getEmbeddingModels } from '../../api/document';
import { Sidebar } from '../../components/common/Sidebar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { usePersistentSidebar } from '../../hooks/usePersistentSidebar';
import type { AdminCategoryStatsItem, AdminDocumentDetailResponse, AdminDocumentItem, AdminDocumentRetryStage } from '../../types/admin';
import type { DocumentStatus, EmbeddingModelOption, TaskType } from '../../types/document';
import {
  getDocumentStatusPresentation,
  getTaskStageLabel,
  normalizeDocumentStatus,
  normalizeTaskStage,
} from '../../utils/documentStatus';
import {
  FileText,
  Upload,
  MessageSquare,
  Clock,
  Menu,
  X,
  Search,
  Bell,
  RefreshCw,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  MoreVertical,
  LogOut,
  Calendar,
  FileType,
  TrendingUp,
  AlertTriangle,
  Trash2,
  Tag,
} from 'lucide-react';

type FilterStatus = 'all' | 'processing' | 'review_required' | 'completed' | 'failed';

interface AdminDocumentPageProps {
  onLogout?: () => void;
}

const PAGE_LIMIT = 20;

const filterStatusMap: Record<Exclude<FilterStatus, 'all'>, DocumentStatus> = {
  processing: 'PROCESSING',
  review_required: 'REVIEW_REQUIRED',
  completed: 'COMPLETED',
  failed: 'FAILED',
};

function getFilterStatusFromParam(status?: string | null): FilterStatus {
  if (status === 'PROCESSING') return 'processing';
  if (status === 'REVIEW_REQUIRED') return 'review_required';
  if (status === 'COMPLETED') return 'completed';
  if (status === 'FAILED') return 'failed';
  return 'all';
}

const taskTypeLabels: Record<TaskType, string> = {
  OCR: 'OCR',
  SUMMARY: 'AI 요약',
  EMBEDDING: '임베딩',
  RAG_INDEXING: 'RAG 준비',
};

const taskTypeColors: Record<TaskType, string> = {
  OCR: 'text-blue-400',
  SUMMARY: 'text-purple-400',
  EMBEDDING: 'text-yellow-400',
  RAG_INDEXING: 'text-green-400',
};

const retryStageOptions: Array<{
  value: AdminDocumentRetryStage;
  label: string;
  description: string;
  warning: string;
}> = [
  {
    value: 'OCR',
    label: 'OCR부터 재처리',
    description: 'OCR 단계부터 다시 실행합니다.',
    warning: 'OCR부터 재처리하면 기존 OCR 결과, 요약, 청크, 임베딩 결과가 초기화됩니다.',
  },
  {
    value: 'SUMMARY',
    label: 'SUMMARY부터 재처리',
    description: 'OCR 결과는 유지하고 요약 단계부터 다시 실행합니다.',
    warning: 'SUMMARY부터 재처리하면 기존 요약, 청크, 임베딩 결과가 초기화됩니다.',
  },
];

function getApiErrorMessage(error: unknown, fallbackMessage = '문서 목록을 불러오지 못했습니다.'): string {
  const response = (error as { response?: { status?: number; data?: { detail?: unknown; message?: string } } }).response;
  const detail = response?.data?.detail;

  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object' && 'msg' in item) return String((item as { msg: unknown }).msg);
        return null;
      })
      .filter(Boolean)
      .join(', ') || fallbackMessage;
  }

  if (response?.data?.message) return response.data.message;

  switch (response?.status) {
    case 401:
      return '인증이 필요합니다. 다시 로그인해 주세요.';
    case 403:
      return '이 작업을 수행할 권한이 없습니다.';
    case 404:
      return '문서를 찾을 수 없습니다.';
    case 500:
      return fallbackMessage;
    default:
      return error instanceof Error ? error.message : fallbackMessage;
  }
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '0 B';

  const units = ['B', 'KB', 'MB', 'GB'];
  const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** unitIndex;

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function normalizeTaskType(taskType?: string | null): TaskType | null {
  const normalized = taskType?.toUpperCase();
  if (normalized === 'OCR' || normalized === 'SUMMARY' || normalized === 'EMBEDDING' || normalized === 'RAG_INDEXING') {
    return normalized;
  }

  return null;
}

function getDocumentProgress(doc: AdminDocumentItem): number {
  if (doc.latest_task) return Math.max(0, Math.min(100, doc.latest_task.progress));

  const status = normalizeDocumentStatus(doc.status);
  if (status === 'COMPLETED' || status === 'REVIEW_REQUIRED') return 100;
  return 0;
}

function getOwnerLabel(doc: AdminDocumentItem): string {
  return doc.owner.name || doc.owner.email;
}

function canRetryDocument(status?: string | null): boolean {
  const normalizedStatus = normalizeDocumentStatus(status);
  return normalizedStatus === 'FAILED' || normalizedStatus === 'COMPLETED' || normalizedStatus === 'REVIEW_REQUIRED';
}

export function AdminDocumentPage({ onLogout }: AdminDocumentPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = usePersistentSidebar();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') ?? '');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(getFilterStatusFromParam(searchParams.get('status')));
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') ?? 'all');
  const [ownerQuery, setOwnerQuery] = useState(searchParams.get('owner') ?? '');
  const [dateFrom, setDateFrom] = useState(searchParams.get('date_from') ?? '');
  const [dateTo, setDateTo] = useState(searchParams.get('date_to') ?? '');
  const [selectedEmbeddingModel, setSelectedEmbeddingModel] = useState(searchParams.get('embedding_model') ?? 'all');
  const [sortBy, setSortBy] = useState<'upload_at' | 'updated_at' | 'file_name' | 'file_size' | 'page_count' | 'status'>('updated_at');
  const [documents, setDocuments] = useState<AdminDocumentItem[]>([]);
  const [categoryStats, setCategoryStats] = useState<AdminCategoryStatsItem[]>([]);
  const [embeddingModels, setEmbeddingModels] = useState<EmbeddingModelOption[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    total_pages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<AdminDocumentDetailResponse | null>(null);
  const [detailErrorMessage, setDetailErrorMessage] = useState<string | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminDocumentItem | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState<string | null>(null);
  const [retryTarget, setRetryTarget] = useState<AdminDocumentItem | null>(null);
  const [retryStage, setRetryStage] = useState<AdminDocumentRetryStage>('OCR');
  const [retryReason, setRetryReason] = useState('');
  const [retryingDocumentId, setRetryingDocumentId] = useState<string | null>(null);
  const [retryErrorMessage, setRetryErrorMessage] = useState<string | null>(null);
  const [retrySuccessMessage, setRetrySuccessMessage] = useState<string | null>(null);
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<string | null>(null);
  const [downloadErrorMessage, setDownloadErrorMessage] = useState<string | null>(null);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);

  const updateQueryParam = useCallback((key: string, value: string) => {
    const nextParams = new URLSearchParams(searchParams);
    const trimmedValue = value.trim();

    if (!trimmedValue || trimmedValue === 'all') nextParams.delete(key);
    else nextParams.set(key, trimmedValue);

    setSearchParams(nextParams, { replace: true });
  }, [searchParams, setSearchParams]);

  const updateStatusFilter = (nextStatus: FilterStatus) => {
    setFilterStatus(nextStatus);
    updateQueryParam('status', nextStatus === 'all' ? 'all' : filterStatusMap[nextStatus]);
  };

  const updateCategoryFilter = (nextCategory: string) => {
    setSelectedCategory(nextCategory);
    updateQueryParam('category', nextCategory);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setSelectedCategory('all');
    setOwnerQuery('');
    setDateFrom('');
    setDateTo('');
    setSelectedEmbeddingModel('all');
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  const fetchDocuments = useCallback(async (page: number, showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setErrorMessage(null);

    try {
      const response = await getAdminDocuments({
        page,
        limit: PAGE_LIMIT,
        status: filterStatus === 'all' ? undefined : filterStatusMap[filterStatus],
        category: selectedCategory === 'all' ? undefined : selectedCategory,
        search: searchQuery.trim() || undefined,
        owner: ownerQuery.trim() || undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        embedding_model: selectedEmbeddingModel === 'all' ? undefined : selectedEmbeddingModel,
        sort_by: sortBy,
        sort_order: 'desc',
      });

      setDocuments(response.items);
      setPagination(response.pagination);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
      setDocuments([]);
      setPagination((current) => ({ ...current, page, total: 0, total_pages: 0 }));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [dateFrom, dateTo, filterStatus, ownerQuery, searchQuery, selectedCategory, selectedEmbeddingModel, sortBy]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchDocuments(1, true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchDocuments]);

  const fetchCategoryStats = useCallback(async () => {
    try {
      const stats = await getAdminCategoryStats();
      setCategoryStats(stats);
    } catch (error) {
      console.error('카테고리 통계를 불러오는 중 오류 발생:', error);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchCategoryStats();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchCategoryStats]);

  useEffect(() => {
    let isMounted = true;

    const fetchEmbeddingModels = async () => {
      try {
        const response = await getEmbeddingModels();
        if (isMounted) {
          setEmbeddingModels(response.models);
        }
      } catch (error) {
        console.error('임베딩 모델 목록을 불러오는 중 오류 발생:', error);
      }
    };

    void fetchEmbeddingModels();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefresh = () => {
    void fetchDocuments(pagination.page, false);
    void fetchCategoryStats();
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || (pagination.total_pages > 0 && nextPage > pagination.total_pages)) return;
    void fetchDocuments(nextPage, true);
  };

  const handleDocumentDetail = async (documentId: string) => {
    setIsDetailLoading(true);
    setDetailErrorMessage(null);

    try {
      const detail = await getAdminDocumentDetail(documentId);
      setSelectedDocument(detail);
    } catch (error) {
      setDetailErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleOpenDeleteConfirm = (document: AdminDocumentItem) => {
    if (deletingDocumentId) return;

    setDeleteTarget(document);
    setDeleteErrorMessage(null);
    setDeleteSuccessMessage(null);
  };

  const handleOpenRetryConfirm = (document: AdminDocumentItem) => {
    if (retryingDocumentId || !canRetryDocument(document.status)) return;

    setRetryTarget(document);
    setRetryStage('OCR');
    setRetryReason('');
    setRetryErrorMessage(null);
    setRetrySuccessMessage(null);
    setDeleteSuccessMessage(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || deletingDocumentId) return;

    setDeletingDocumentId(deleteTarget.id);
    setDeleteErrorMessage(null);
    setDeleteSuccessMessage(null);

    try {
      const response = await deleteAdminDocument(deleteTarget.id);
      setDeleteSuccessMessage(response.message || `${response.file_name} 문서를 삭제했습니다.`);
      setDeleteTarget(null);

      if (selectedDocument?.id === deleteTarget.id) {
        setSelectedDocument(null);
        setDetailErrorMessage(null);
      }

      await fetchDocuments(pagination.page, false);
      await fetchCategoryStats();
    } catch (error) {
      setDeleteErrorMessage(getApiErrorMessage(error, '문서를 삭제하지 못했습니다.'));
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const handleConfirmRetry = async () => {
    if (!retryTarget || retryingDocumentId) return;

    setRetryingDocumentId(retryTarget.id);
    setRetryErrorMessage(null);
    setRetrySuccessMessage(null);

    try {
      const response = await retryAdminDocumentFromStage(retryTarget.id, retryStage, retryReason);
      const stageLabel = retryStageOptions.find((option) => option.value === response.retry_from_stage)?.label ?? response.retry_from_stage;
      setRetrySuccessMessage(response.message || `${retryTarget.file_name} 문서의 ${stageLabel} 요청을 등록했습니다.`);
      setRetryTarget(null);
      setRetryReason('');

      if (selectedDocument?.id === retryTarget.id) {
        setSelectedDocument(null);
        setDetailErrorMessage(null);
      }

      await fetchDocuments(pagination.page, false);
      await fetchCategoryStats();
    } catch (error) {
      setRetryErrorMessage(getApiErrorMessage(error, '문서 재처리를 요청하지 못했습니다.'));
    } finally {
      setRetryingDocumentId(null);
    }
  };

  const handleDownloadOriginal = async (document: AdminDocumentItem) => {
    if (downloadingDocumentId) return;

    setDownloadingDocumentId(document.id);
    setDownloadErrorMessage(null);
    setDownloadSuccessMessage(null);
    setDeleteSuccessMessage(null);
    setRetrySuccessMessage(null);

    try {
      const downloadedFileName = await downloadAdminDocumentOriginal(document.id, document.file_name);
      setDownloadSuccessMessage(`${downloadedFileName} 원본 다운로드를 시작했습니다.`);
    } catch (error) {
      setDownloadErrorMessage(getApiErrorMessage(error, '원본 문서를 다운로드하지 못했습니다.'));
    } finally {
      setDownloadingDocumentId(null);
    }
  };

  const stats = useMemo(() => {
    const countByStatus = documents.reduce<Record<DocumentStatus, number>>((counts, doc) => {
      const status = normalizeDocumentStatus(doc.status);
      counts[status] += 1;
      return counts;
    }, { PENDING: 0, PROCESSING: 0, REVIEW_REQUIRED: 0, COMPLETED: 0, FAILED: 0 });

    const today = new Date().toDateString();
    const uploadedToday = documents.filter((doc) => {
      const uploadDate = new Date(doc.upload_at);
      return !Number.isNaN(uploadDate.getTime()) && uploadDate.toDateString() === today;
    }).length;

    return [
      { label: '전체 문서', value: pagination.total.toLocaleString(), change: `page ${pagination.page}`, icon: FileText, color: 'primary' },
      { label: '처리 중', value: countByStatus.PROCESSING.toLocaleString(), change: '현재 페이지', icon: Loader2, color: 'blue', animate: countByStatus.PROCESSING > 0 },
      { label: '처리 완료', value: countByStatus.COMPLETED.toLocaleString(), change: '현재 페이지', icon: CheckCircle2, color: 'green' },
      { label: '실패', value: countByStatus.FAILED.toLocaleString(), change: '현재 페이지', icon: XCircle, color: 'red' },
      { label: '검토 필요', value: countByStatus.REVIEW_REQUIRED.toLocaleString(), change: '현재 페이지', icon: Clock, color: 'yellow' },
      { label: '오늘 업로드', value: uploadedToday.toLocaleString(), change: '현재 페이지', icon: Upload, color: 'purple' },
    ];
  }, [documents, pagination.page, pagination.total]);

  const recentUploads = useMemo(() => documents.slice(0, 3), [documents]);
  const failedDocs = useMemo(
    () => documents.filter((doc) => normalizeDocumentStatus(doc.status) === 'FAILED'),
    [documents],
  );
  const processingDocs = useMemo(
    () => documents.filter((doc) => {
      const status = normalizeDocumentStatus(doc.status);
      return status === 'PENDING' || status === 'PROCESSING' || status === 'REVIEW_REQUIRED';
    }),
    [documents],
  );

  const distribution = useMemo(() => {
    const counts: Record<TaskType, number> = { OCR: 0, SUMMARY: 0, EMBEDDING: 0, RAG_INDEXING: 0 };

    documents.forEach((doc) => {
      const taskType = normalizeTaskType(doc.latest_task?.task_type) ?? normalizeTaskStage(doc.latest_task?.stage);
      if (taskType) counts[taskType] += 1;
    });

    const total = Math.max(1, Object.values(counts).reduce((sum, count) => sum + count, 0));
    return Object.entries(counts).map(([type, count]) => ({
      type: type as TaskType,
      percent: Math.round((count / total) * 100),
    }));
  }, [documents]);

  return (
    <div className="min-h-screen w-full bg-[#0a0a0f] flex">
      <Sidebar
        variant="admin"
        sidebarOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((open) => !open)}
        onLogout={onLogout}
      />

      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        <header className="h-16 bg-[#111116]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5 text-gray-400" /> : <Menu className="w-5 h-5 text-gray-400" />}
            </button>

            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="search"
                placeholder="문서 검색..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  updateQueryParam('search', e.target.value);
                }}
                className="w-64 lg:w-96 pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              title="새로고침"
            >
              <RefreshCw className={`w-5 h-5 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              className="p-2 hover:bg-white/5 rounded-lg transition-colors relative"
            >
              <Bell className="w-5 h-5 text-gray-400" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-400 rounded-full" />
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white text-sm"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-[1800px] mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">문서 관리</h2>
                <p className="text-gray-400">총 {pagination.total.toLocaleString()}개의 문서</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {stats.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <div key={idx} className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-blue-500 rounded-xl opacity-0 group-hover:opacity-20 blur transition-opacity" />
                    <div className="relative bg-[#111116] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-2 rounded-lg ${
                          stat.color === 'primary' ? 'bg-primary/10' :
                          stat.color === 'green' ? 'bg-green-500/10' :
                          stat.color === 'red' ? 'bg-red-500/10' :
                          stat.color === 'blue' ? 'bg-blue-500/10' :
                          stat.color === 'yellow' ? 'bg-yellow-500/10' :
                          'bg-purple-500/10'
                        }`}>
                          <Icon className={`w-5 h-5 ${
                            stat.color === 'primary' ? 'text-primary' :
                            stat.color === 'green' ? 'text-green-400' :
                            stat.color === 'red' ? 'text-red-400' :
                            stat.color === 'blue' ? 'text-blue-400 ' + ('animate' in stat && stat.animate ? 'animate-spin' : '') :
                            stat.color === 'yellow' ? 'text-yellow-400' :
                            'text-purple-400'
                          }`} />
                        </div>
                        <span className="text-green-400 text-xs font-medium">{stat.change}</span>
                      </div>
                      <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              <div className="xl:col-span-3 space-y-4">
                <div className="rounded-xl border border-white/10 bg-[#111116] p-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-gray-500">검색어</span>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                        <input
                          type="search"
                          value={searchQuery}
                          onChange={(event) => {
                            setSearchQuery(event.target.value);
                            updateQueryParam('search', event.target.value);
                          }}
                          className="h-10 w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                          placeholder="파일명, 키워드, 요약"
                        />
                      </div>
                    </label>

                    <label className="space-y-1">
                      <span className="text-xs font-medium text-gray-500">상태</span>
                      <select
                        value={filterStatus}
                        onChange={(event) => updateStatusFilter(event.target.value as FilterStatus)}
                        className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="all">전체</option>
                        <option value="processing">처리 중</option>
                        <option value="review_required">검토 필요</option>
                        <option value="completed">완료</option>
                        <option value="failed">실패</option>
                      </select>
                    </label>

                    <label className="space-y-1">
                      <span className="text-xs font-medium text-gray-500">카테고리</span>
                      <select
                        value={selectedCategory}
                        onChange={(event) => updateCategoryFilter(event.target.value)}
                        className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="all">전체</option>
                        {categoryStats.map((category) => (
                          <option key={category.id} value={category.name}>{category.name}</option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-1">
                      <span className="text-xs font-medium text-gray-500">시작일</span>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(event) => {
                          setDateFrom(event.target.value);
                          updateQueryParam('date_from', event.target.value);
                        }}
                        className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-xs font-medium text-gray-500">종료일</span>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(event) => {
                          setDateTo(event.target.value);
                          updateQueryParam('date_to', event.target.value);
                        }}
                        className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-xs font-medium text-gray-500">소유자</span>
                      <input
                        type="search"
                        value={ownerQuery}
                        onChange={(event) => {
                          setOwnerQuery(event.target.value);
                          updateQueryParam('owner', event.target.value);
                        }}
                        className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        placeholder="이름 또는 이메일"
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-xs font-medium text-gray-500">임베딩 모델</span>
                      <select
                        value={selectedEmbeddingModel}
                        onChange={(event) => {
                          setSelectedEmbeddingModel(event.target.value);
                          updateQueryParam('embedding_model', event.target.value);
                        }}
                        className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <option value="all">전체</option>
                        {embeddingModels.map((model) => (
                          <option key={model.value} value={model.value}>{model.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-medium text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                    >
                      <RefreshCw className="h-4 w-4" />
                      초기화
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {([
                    ['all', '전체'],
                    ['processing', '처리 중'],
                    ['review_required', '검토 필요'],
                    ['completed', '완료'],
                    ['failed', '실패'],
                  ] as const).map(([status, label]) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => updateStatusFilter(status)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        filterStatus === status
                          ? 'bg-primary text-white'
                          : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {label}
                    </button>
                  ))}

                  <div className="flex-1" />

                  <div className="flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3">
                    <Tag className="h-4 w-4 text-gray-400" />
                    <select
                      value={selectedCategory}
                      onChange={(event) => updateCategoryFilter(event.target.value)}
                      className="bg-transparent text-sm text-gray-300 focus:outline-none"
                      title="카테고리 필터"
                    >
                      <option value="all">Category Filter</option>
                      {categoryStats.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                    className="h-10 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    title="정렬"
                  >
                    <option value="updated_at">최근 수정순</option>
                    <option value="upload_at">업로드순</option>
                    <option value="file_name">문서명순</option>
                    <option value="file_size">파일 크기순</option>
                    <option value="page_count">페이지순</option>
                    <option value="status">상태순</option>
                  </select>

                  <button
                    type="button"
                    className="p-2 bg-white/5 border border-white/10 rounded-lg transition-colors opacity-50 cursor-not-allowed"
                    title="준비 중"
                    disabled
                  >
                    <Download className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                    title="새로고침"
                  >
                    <RefreshCw className={`w-4 h-4 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {errorMessage && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">문서 목록 오류</p>
                      <p className="mt-1 text-sm text-red-300/80">{errorMessage}</p>
                    </div>
                  </div>
                )}

                {deleteSuccessMessage && (
                  <div className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-green-300">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <span className="text-sm">{deleteSuccessMessage}</span>
                  </div>
                )}

                {retrySuccessMessage && (
                  <div className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-green-300">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <span className="text-sm">{retrySuccessMessage}</span>
                  </div>
                )}

                {downloadSuccessMessage && (
                  <div className="flex items-center gap-3 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-green-300">
                    <CheckCircle2 className="h-5 w-5 shrink-0" />
                    <span className="text-sm">{downloadSuccessMessage}</span>
                  </div>
                )}

                {downloadErrorMessage && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">원본 다운로드 오류</p>
                      <p className="mt-1 text-sm text-red-300/80">{downloadErrorMessage}</p>
                    </div>
                  </div>
                )}

                <div className="bg-[#111116] border border-white/10 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">문서명</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">소유자</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">업로드</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">크기</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">최근 작업</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">진행률</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">상태</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">액션</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {isLoading ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-12 text-center">
                              <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />
                              <p className="text-sm text-gray-400">문서 목록을 불러오는 중입니다.</p>
                            </td>
                          </tr>
                        ) : documents.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-12 text-center">
                              <FileText className="mx-auto mb-3 h-6 w-6 text-gray-500" />
                              <p className="text-sm font-medium text-white">표시할 문서가 없습니다.</p>
                              <p className="mt-1 text-sm text-gray-500">검색어나 상태 필터를 변경하거나 새로고침해 주세요.</p>
                            </td>
                          </tr>
                        ) : documents.map((doc) => {
                          const normalizedStatus = normalizeDocumentStatus(doc.status);
                          const progress = getDocumentProgress(doc);
                          const taskType = normalizeTaskType(doc.latest_task?.task_type);
                          const statusPresentation = getDocumentStatusPresentation(doc.status, doc.latest_task?.stage);
                          const retryAllowed = canRetryDocument(doc.status);

                          return (
                            <tr key={doc.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-primary/10 rounded-lg">
                                    <FileText className="w-4 h-4 text-primary" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-white font-medium text-sm truncate max-w-xs">{doc.file_name}</p>
                                    <div className="mt-1 flex items-center gap-2">
                                      {doc.category && (
                                        <span className="inline-block px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-gray-400">
                                          {doc.category}
                                        </span>
                                      )}
                                      <span className="text-xs text-gray-500">{doc.page_count ?? 0}p</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                <div>
                                  <p>{getOwnerLabel(doc)}</p>
                                  <p className="text-xs text-gray-500">{doc.owner.email}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {formatDateTime(doc.upload_at)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                <div className="flex items-center gap-1.5">
                                  <FileType className="w-3.5 h-3.5 text-gray-400" />
                                  {formatFileSize(doc.file_size)}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {doc.latest_task ? (
                                  <div className="space-y-1">
                                    <span className={`text-xs font-medium ${taskType ? taskTypeColors[taskType] : 'text-gray-400'}`}>
                                      {taskType ? taskTypeLabels[taskType] : doc.latest_task.task_type}
                                    </span>
                                    <p className="text-xs text-gray-500">{getTaskStageLabel(doc.latest_task.stage)}</p>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-500">-</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="w-32">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-gray-400">{progress}%</span>
                                  </div>
                                  <div className="w-full bg-white/5 rounded-full h-1.5">
                                    <div
                                      className={`${statusPresentation.progressColor} h-1.5 rounded-full transition-all duration-500`}
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <StatusBadge status={doc.status} stage={doc.latest_task?.stage} size="sm" />
                                {doc.latest_task?.error_message && (
                                  <p className="text-xs text-red-400/80 mt-1 max-w-xs truncate">{doc.latest_task.error_message}</p>
                                )}
                                {doc.process_at && (
                                  <p className="text-xs text-gray-500 mt-1">처리: {formatDateTime(doc.process_at)}</p>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {(normalizedStatus === 'COMPLETED' || normalizedStatus === 'REVIEW_REQUIRED') && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => void handleDocumentDetail(doc.id)}
                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                        title="상세보기"
                                      >
                                        <Eye className="w-4 h-4 text-gray-400" />
                                      </button>
                                      <button
                                        type="button"
                                        className="p-2 rounded-lg transition-colors opacity-50 cursor-not-allowed"
                                        title="준비 중"
                                        disabled
                                      >
                                        <MessageSquare className="w-4 h-4 text-gray-400" />
                                      </button>
                                    </>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRetryConfirm(doc)}
                                    disabled={!retryAllowed || retryingDocumentId !== null}
                                    className="p-2 rounded-lg transition-colors hover:bg-yellow-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                                    title={retryAllowed ? '문서 재처리' : '대기/처리 중 문서는 재처리할 수 없습니다'}
                                  >
                                    {retryingDocumentId === doc.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />
                                    ) : (
                                      <RefreshCw className="w-4 h-4 text-yellow-400" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void handleDownloadOriginal(doc)}
                                    disabled={downloadingDocumentId !== null}
                                    className="inline-flex min-w-[112px] items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-primary/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                    title="원본 다운로드"
                                    aria-label={`${doc.file_name} 원본 다운로드`}
                                  >
                                    {downloadingDocumentId === doc.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                    ) : (
                                      <Download className="w-4 h-4 text-primary" />
                                    )}
                                    <span>원본 다운로드</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenDeleteConfirm(doc)}
                                    disabled={deletingDocumentId !== null}
                                    className="p-2 rounded-lg transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                                    title="문서 삭제"
                                  >
                                    {deletingDocumentId === doc.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin text-red-400" />
                                    ) : (
                                      <Trash2 className="w-4 h-4 text-red-400" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    className="p-2 rounded-lg transition-colors opacity-50 cursor-not-allowed"
                                    title="준비 중"
                                    disabled
                                  >
                                    <MoreVertical className="w-4 h-4 text-gray-400" />
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

                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#111116] px-4 py-3">
                  <p className="text-sm text-gray-400">
                    {pagination.total.toLocaleString()}개 중 {documents.length.toLocaleString()}개 표시
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1 || isLoading}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      이전
                    </button>
                    <span className="min-w-24 text-center text-sm text-gray-400">
                      {pagination.page} / {Math.max(1, pagination.total_pages)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.total_pages || isLoading || pagination.total_pages === 0}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      다음
                    </button>
                  </div>
                </div>

                {(selectedDocument || detailErrorMessage || isDetailLoading) && (
                  <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                        <Eye className="w-5 h-5 text-primary" />
                        문서 상세
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDocument(null);
                          setDetailErrorMessage(null);
                        }}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        title="닫기"
                      >
                        <X className="h-4 w-4 text-gray-400" />
                      </button>
                    </div>
                    {isDetailLoading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        상세 정보를 불러오는 중입니다.
                      </div>
                    ) : detailErrorMessage ? (
                      <p className="text-sm text-red-300">{detailErrorMessage}</p>
                    ) : selectedDocument && (
                      <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                        <div>
                          <dt className="text-gray-500">문서명</dt>
                          <dd className="text-white">{selectedDocument.file_name}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">소유자</dt>
                          <dd className="text-white">{getOwnerLabel(selectedDocument)}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">상태</dt>
                          <dd><StatusBadge status={selectedDocument.status} stage={selectedDocument.latest_task?.stage} size="sm" /></dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">최근 작업</dt>
                          <dd className="text-white">{selectedDocument.latest_task?.task_type ?? '-'}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">페이지 / 청크</dt>
                          <dd className="text-white">{selectedDocument.page_count ?? 0}p / {selectedDocument.chunk_count}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">파일 크기</dt>
                          <dd className="text-white">{formatFileSize(selectedDocument.file_size)}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">업로드</dt>
                          <dd className="text-white">{formatDateTime(selectedDocument.upload_at)}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">처리</dt>
                          <dd className="text-white">{formatDateTime(selectedDocument.process_at)}</dd>
                        </div>
                        <div className="md:col-span-2">
                          <dt className="text-gray-500">키워드</dt>
                          <dd className="text-white">{selectedDocument.keywords.length ? selectedDocument.keywords.join(', ') : '-'}</dd>
                        </div>
                        <div className="md:col-span-2">
                          <dt className="text-gray-500">요약</dt>
                          <dd className="text-white">{selectedDocument.summary ?? '-'}</dd>
                        </div>
                      </dl>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                    <Tag className="w-5 h-5 text-primary" />
                    카테고리 현황
                  </h3>
                  <div className="space-y-2">
                    {categoryStats.length === 0 ? (
                      <p className="text-sm text-gray-500">카테고리 통계를 불러오는 중입니다.</p>
                    ) : categoryStats.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => updateCategoryFilter(category.name)}
                        className={`w-full rounded-lg border p-3 text-left transition-colors ${
                          selectedCategory === category.name
                            ? 'border-primary/50 bg-primary/10'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        }`}
                        title={`${category.name} 문서 필터`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-white">{category.name}</span>
                          <span className="text-sm font-semibold text-primary">{category.document_count.toLocaleString()}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-gray-500">문서 수</span>
                          <span className={`rounded px-2 py-0.5 text-xs ${
                            category.is_active
                              ? 'bg-green-500/10 text-green-300'
                              : 'bg-gray-500/10 text-gray-400'
                          }`}>
                            {category.is_active ? '활성' : '비활성'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-4">최근 업로드</h3>
                  <div className="space-y-3">
                    {recentUploads.length === 0 ? (
                      <p className="text-sm text-gray-500">최근 업로드 문서가 없습니다.</p>
                    ) : recentUploads.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <FileText className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <p className="text-white text-sm font-medium line-clamp-1">{doc.file_name}</p>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">{getOwnerLabel(doc)}</span>
                          <span className="text-gray-500">{formatDateTime(doc.upload_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {failedDocs.length > 0 && (
                  <div className="bg-[#111116] border border-red-500/20 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      <h3 className="text-white font-semibold text-lg">실패한 문서</h3>
                    </div>
                    <div className="space-y-3">
                      {failedDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
                        >
                          <p className="text-white text-sm font-medium mb-1 line-clamp-1">{doc.file_name}</p>
                          <p className="text-red-400/80 text-xs mb-2">{doc.latest_task?.error_message ?? doc.latest_task?.message ?? '-'}</p>
                          <button
                            type="button"
                            onClick={() => handleOpenRetryConfirm(doc)}
                            disabled={!canRetryDocument(doc.status) || retryingDocumentId !== null}
                            className="w-full py-1.5 px-3 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-xs transition-colors flex items-center justify-center gap-1.5 hover:bg-red-500/30 disabled:cursor-not-allowed disabled:opacity-50"
                            title="문서 재처리"
                          >
                            {retryingDocumentId === doc.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <RefreshCw className="w-3 h-3" />
                            )}
                            재시도
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-4">큐 상태</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-400 text-sm">처리 중</span>
                        <span className="text-white text-sm font-medium">
                          {processingDocs.filter((doc) => normalizeDocumentStatus(doc.status) === 'PROCESSING').length}
                        </span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(100, processingDocs.length * 20)}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-400 text-sm">대기/검토</span>
                        <span className="text-white text-sm font-medium">
                          {processingDocs.filter((doc) => normalizeDocumentStatus(doc.status) !== 'PROCESSING').length}
                        </span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${Math.min(100, processingDocs.length * 20)}%` }} />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-green-400 text-sm">API 연동됨</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    처리 분포
                  </h3>
                  <div className="space-y-3">
                    {distribution.map(({ type, percent }) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">{taskTypeLabels[type]}</span>
                        <span className={`${taskTypeColors[type]} text-sm font-medium`}>{percent}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !deletingDocumentId && setDeleteTarget(null)}
          />
          <div className="relative w-full max-w-md rounded-xl border border-red-500/20 bg-[#111116] p-6 shadow-2xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-2">
                <Trash2 className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">문서 삭제 확인</h3>
                <p className="mt-1 text-sm text-gray-400">삭제 대상 문서를 확인해 주세요.</p>
              </div>
            </div>

            <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-gray-500">문서명</p>
              <p className="mt-1 break-words text-sm font-medium text-white">{deleteTarget.file_name}</p>
            </div>

            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
              <p className="font-medium">이 작업은 되돌릴 수 없습니다.</p>
              <p className="mt-1 text-red-200/80">
                문서, 페이지, 청크, 임베딩, 작업 이력, 저장 파일이 삭제됩니다.
              </p>
            </div>

            {deleteErrorMessage && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{deleteErrorMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deletingDocumentId !== null}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-gray-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDelete()}
                disabled={deletingDocumentId !== null}
                className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-500/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingDocumentId && <Loader2 className="h-4 w-4 animate-spin" />}
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {retryTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !retryingDocumentId && setRetryTarget(null)}
          />
          <div className="relative w-full max-w-lg rounded-xl border border-yellow-500/20 bg-[#111116] p-6 shadow-2xl">
            <div className="mb-4 flex items-start gap-3">
              <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-2">
                <RefreshCw className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">문서 재처리 확인</h3>
                <p className="mt-1 text-sm text-gray-400">재처리 대상과 시작 단계를 확인해 주세요.</p>
              </div>
            </div>

            <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-gray-500">문서명</p>
              <p className="mt-1 break-words text-sm font-medium text-white">{retryTarget.file_name}</p>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {retryStageOptions.map((option) => (
                <label
                  key={option.value}
                  className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                    retryStage === option.value
                      ? 'border-yellow-500/50 bg-yellow-500/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <input
                    type="radio"
                    name="retry-stage"
                    value={option.value}
                    checked={retryStage === option.value}
                    onChange={() => setRetryStage(option.value)}
                    disabled={retryingDocumentId !== null}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium text-white">{option.label}</span>
                  <span className="mt-1 block text-xs text-gray-400">{option.description}</span>
                </label>
              ))}
            </div>

            <label className="mb-4 block">
              <span className="mb-2 block text-sm font-medium text-gray-300">재처리 사유</span>
              <textarea
                value={retryReason}
                onChange={(event) => setRetryReason(event.target.value)}
                disabled={retryingDocumentId !== null}
                rows={3}
                placeholder="예: OCR 결과 품질 문제"
                className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-yellow-500/50 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </label>

            <div className="mb-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-100">
              <p className="font-medium">재처리 시 기존 산출물이 초기화됩니다.</p>
              <p className="mt-1 text-yellow-100/80">
                {retryStageOptions.find((option) => option.value === retryStage)?.warning}
              </p>
            </div>

            {retryErrorMessage && (
              <div className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{retryErrorMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRetryTarget(null)}
                disabled={retryingDocumentId !== null}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-gray-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmRetry()}
                disabled={retryingDocumentId !== null}
                className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-black transition-colors hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {retryingDocumentId && <Loader2 className="h-4 w-4 animate-spin" />}
                재처리 요청
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
