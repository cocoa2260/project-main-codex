import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Sidebar } from '../../components/common/Sidebar';
import { StatusBadge } from '@/components/common/StatusBadge';
import { getCategories } from '@/api/category';
import {
  cancelDocument,
  deleteUserDocument,
  downloadDocumentOriginal,
  getEmbeddingModels,
  getDocuments,
  reprocessDocument,
} from '@/api/document';
import { usePersistentSidebar } from '../../hooks/usePersistentSidebar';
import type { DocumentItem, DocumentStatus, EmbeddingModelOption, TaskStage } from '@/types/document';
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
  Grid3x3,
  List,
  Calendar,
  FileType,
  Layers,
  Activity,
  Trash2,
  LogOut,
  XCircle,
} from 'lucide-react';

type SortBy = 'recent' | 'oldest' | 'name';
type FilterStatus = 'all' | 'processing' | 'completed' | 'failed';

const DEFAULT_CATEGORY_NAMES = [
  '민법',
  '형법',
  '민사소송법',
  '형사소송법',
  '상법',
  '행정법',
  '노동법',
  '조세법',
  '헌법',
  '지식재산권법',
  '개인정보보호법',
  '기타',
];

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
  categoryConfidence?: number | null;
  summary?: string;
  keywords: string[];
  selectedEmbeddingModel?: string | null;
  progress?: number;
}

interface DocumentListPageProps {
  onLogout?: () => void;
  onOpenSummary?: (id: string) => void;
  onOpenChat?: (id: string) => void;
}

interface DocumentFilterForm {
  search: string;
  status: string;
  category: string;
  dateFrom: string;
  dateTo: string;
  embeddingModel: string;
}

interface DocumentFilterDraftState {
  key: string;
  filters: DocumentFilterForm;
}

function getFilterFormFromParams(searchParams: URLSearchParams): DocumentFilterForm {
  return {
    search: searchParams.get('search') ?? '',
    status: searchParams.get('status') ?? 'all',
    category: searchParams.get('category') ?? 'all',
    dateFrom: searchParams.get('date_from') ?? '',
    dateTo: searchParams.get('date_to') ?? '',
    embeddingModel: searchParams.get('embedding_model') ?? 'all',
  };
}

function getDocumentListParams(filters: DocumentFilterForm) {
  return {
    search: filters.search.trim() || undefined,
    category: filters.category !== 'all' ? filters.category : undefined,
    date_from: filters.dateFrom || undefined,
    date_to: filters.dateTo || undefined,
    embedding_model: filters.embeddingModel !== 'all' ? filters.embeddingModel : undefined,
  };
}

function setFilterParam(params: URLSearchParams, key: string, value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue || trimmedValue === 'all') params.delete(key);
  else params.set(key, trimmedValue);
}

function formatBytes(bytes?: number | null) {
  if (!bytes) return '-';

  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;

  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function getFilterStatusFromParam(statusParam: string | null): FilterStatus {
  if (statusParam === 'processing') return 'processing';

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

function mapDocument(doc: DocumentItem): Document {
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
    categoryConfidence: doc.category_confidence ?? null,
    summary: doc.summary ?? undefined,
    keywords: doc.keywords ?? [],
    selectedEmbeddingModel: doc.selected_embedding_model,
    progress: getDocumentProgress(status),
  };
}

function formatConfidence(confidence?: number | null) {
  if (confidence === null || confidence === undefined) return null;
  return `${Math.round(confidence * 100)}%`;
}

function getApiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string; message?: string } } }).response;
    return response?.data?.detail ?? response?.data?.message ?? fallback;
  }

  if (error instanceof Error) return error.message;

  return fallback;
}

function canDeleteDocument(status: DocumentStatus) {
  return status === 'REVIEW_REQUIRED' || status === 'COMPLETED' || status === 'FAILED';
}

function canReprocessDocument(status: DocumentStatus) {
  return status === 'REVIEW_REQUIRED' || status === 'COMPLETED' || status === 'FAILED';
}

function canCancelDocument(status: DocumentStatus) {
  return status === 'PROCESSING';
}

export function DocumentListPage({ onLogout, onOpenSummary, onOpenChat }: DocumentListPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as { message?: string } | null;
  const routeMessage = routeState?.message;
  const [searchParams, setSearchParams] = useSearchParams();
  const appliedFilters = getFilterFormFromParams(searchParams);
  const appliedFiltersKey = location.search;
  const [sidebarOpen, setSidebarOpen] = usePersistentSidebar();
  const [draftFilterState, setDraftFilterState] = useState<DocumentFilterDraftState>(() => ({
    key: appliedFiltersKey,
    filters: appliedFilters,
  }));
  const draftFilters = draftFilterState.key === appliedFiltersKey ? draftFilterState.filters : appliedFilters;
  const dateFromInputRef = useRef<HTMLInputElement | null>(null);
  const dateToInputRef = useRef<HTMLInputElement | null>(null);
  const [categoryNames, setCategoryNames] = useState<string[]>(DEFAULT_CATEGORY_NAMES);
  const [embeddingModels, setEmbeddingModels] = useState<EmbeddingModelOption[]>([]);
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(routeMessage ?? null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [downloadingDocumentId, setDownloadingDocumentId] = useState<string | null>(null);
  const [deletingDocumentId, setDeletingDocumentId] = useState<string | null>(null);
  const [reprocessingDocumentId, setReprocessingDocumentId] = useState<string | null>(null);
  const [cancellingDocumentId, setCancellingDocumentId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [reprocessTarget, setReprocessTarget] = useState<Document | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Document | null>(null);
  const filterStatus = getFilterStatusFromParam(appliedFilters.status);

  const updateDraftFilter = (key: keyof DocumentFilterForm, value: string) => {
    setDraftFilterState((currentDraft) => ({
      key: appliedFiltersKey,
      filters: {
        ...(currentDraft.key === appliedFiltersKey ? currentDraft.filters : appliedFilters),
        [key]: value,
      },
    }));
  };

  const openDatePicker = (input: HTMLInputElement | null) => {
    try {
      input?.showPicker?.();
    } catch {
      // showPicker can only run during supported direct user gestures.
    }
  };

  const applyFilters = () => {
    const nextParams = new URLSearchParams();
    setFilterParam(nextParams, 'search', draftFilters.search);
    setFilterParam(nextParams, 'status', draftFilters.status);
    setFilterParam(nextParams, 'category', draftFilters.category);
    setFilterParam(nextParams, 'date_from', draftFilters.dateFrom);
    setFilterParam(nextParams, 'date_to', draftFilters.dateTo);
    setFilterParam(nextParams, 'embedding_model', draftFilters.embeddingModel);
    setSearchParams(nextParams, { replace: true });
  };

  const resetFilters = () => {
    const emptyFilters = getFilterFormFromParams(new URLSearchParams());
    setDraftFilterState({
      key: '',
      filters: emptyFilters,
    });
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  useEffect(() => {
    if (routeMessage) {
      navigate(location.pathname + location.search, { replace: true, state: null });
    }
  }, [location.pathname, location.search, navigate, routeMessage]);

  const loadDocuments = async (options?: { showLoading?: boolean }) => {
    const currentFilters = getFilterFormFromParams(new URLSearchParams(appliedFiltersKey));

    try {
      if (options?.showLoading ?? true) {
        setIsLoading(true);
      }
      setError(null);

      const docs = await getDocuments(getDocumentListParams(currentFilters));
      setDocuments(docs.map(mapDocument));
    } catch (loadError) {
      console.error('문서 목록을 불러오는 중 오류 발생:', loadError);
      setError('문서 목록을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const currentFilters = getFilterFormFromParams(new URLSearchParams(appliedFiltersKey));

    const loadMountedDocuments = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const docs = await getDocuments(getDocumentListParams(currentFilters));
        if (isMounted) {
          setDocuments(docs.map(mapDocument));
        }
      } catch (loadError) {
        if (isMounted) {
          console.error('문서 목록을 불러오는 중 오류 발생:', loadError);
          setError('문서 목록을 불러오지 못했습니다.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadMountedDocuments();

    return () => {
      isMounted = false;
    };
  }, [appliedFiltersKey]);

  useEffect(() => {
    let isMounted = true;

    const loadCategories = async () => {
      try {
        const categories = await getCategories();
        const names = categories.map((category) => category.name).filter(Boolean);
        if (isMounted && names.length > 0) {
          setCategoryNames(names);
        }
      } catch (categoryError) {
        console.error('카테고리 목록을 불러오는 중 오류 발생:', categoryError);
      }
    };

    void loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadEmbeddingModels = async () => {
      try {
        const response = await getEmbeddingModels();
        if (isMounted) {
          setEmbeddingModels(response.models);
        }
      } catch (embeddingModelError) {
        console.error('임베딩 모델 목록을 불러오는 중 오류 발생:', embeddingModelError);
      }
    };

    void loadEmbeddingModels();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredDocuments = documents.filter(doc => {
    const matchesFilter =
      filterStatus === 'all' ? true :
      filterStatus === 'processing' ? doc.status === 'PENDING' || doc.status === 'PROCESSING' || doc.status === 'REVIEW_REQUIRED' :
      filterStatus === 'completed' ? doc.status === 'COMPLETED' :
      filterStatus === 'failed' ? doc.status === 'FAILED' : true;

    return matchesFilter;
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
  const handleDownload = async (doc: Document) => {
    try {
      setActionError(null);
      setActionMessage(null);
      setDownloadingDocumentId(doc.id);
      const fileName = await downloadDocumentOriginal(doc.id, doc.name);
      setActionMessage(`${fileName} 다운로드를 시작했습니다.`);
    } catch (downloadError) {
      setActionError(getApiErrorMessage(downloadError, '원본 파일을 다운로드하지 못했습니다.'));
    } finally {
      setDownloadingDocumentId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setActionError(null);
      setActionMessage(null);
      setDeletingDocumentId(deleteTarget.id);
      const response = await deleteUserDocument(deleteTarget.id);
      setActionMessage(response.message || `${response.file_name} 문서를 삭제했습니다.`);
      setDeleteTarget(null);
      await loadDocuments({ showLoading: false });
    } catch (deleteError) {
      setActionError(getApiErrorMessage(deleteError, '문서를 삭제하지 못했습니다.'));
    } finally {
      setDeletingDocumentId(null);
    }
  };

  const handleConfirmReprocess = async () => {
    if (!reprocessTarget) return;

    try {
      setActionError(null);
      setActionMessage(null);
      setReprocessingDocumentId(reprocessTarget.id);
      const response = await reprocessDocument(reprocessTarget.id);
      setActionMessage(response.message || '문서 재처리를 시작했습니다.');
      setReprocessTarget(null);
      await loadDocuments({ showLoading: false });
    } catch (reprocessError) {
      setActionError(getApiErrorMessage(reprocessError, '문서 재처리를 요청하지 못했습니다.'));
    } finally {
      setReprocessingDocumentId(null);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;

    try {
      setActionError(null);
      setActionMessage(null);
      setCancellingDocumentId(cancelTarget.id);
      const response = await cancelDocument(cancelTarget.id);
      setActionMessage(response.message || '문서 처리를 취소했습니다.');
      setCancelTarget(null);
      await loadDocuments({ showLoading: false });
    } catch (cancelError) {
      setActionError(getApiErrorMessage(cancelError, '문서 처리를 취소하지 못했습니다.'));
    } finally {
      setCancellingDocumentId(null);
    }
  };

  const stats = {
    total: documents.length,
    completed: documents.filter(d => d.status === 'COMPLETED').length,
    processing: documents.filter(d => d.status === 'PENDING' || d.status === 'PROCESSING' || d.status === 'REVIEW_REQUIRED').length,
    failed: documents.filter(d => d.status === 'FAILED').length
  };
  const visibleDocumentCount = filteredDocuments.length;

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
          <div className="flex items-center gap-4" />

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
                <p className="text-zinc-300">총 {visibleDocumentCount}개의 문서</p>
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

            <form
              className="rounded-xl border border-white/10 bg-[#15151c] p-4"
              onSubmit={(event) => {
                event.preventDefault();
                applyFilters();
              }}
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                <label className="space-y-1">
                  <span className="text-xs font-medium text-zinc-400">검색어</span>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="search"
                      value={draftFilters.search}
                      onChange={(event) => updateDraftFilter('search', event.target.value)}
                      className="h-10 w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      placeholder="파일명, 키워드, 요약"
                    />
                  </div>
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium text-zinc-400">상태</span>
                  <select
                    value={draftFilters.status}
                    onChange={(event) => updateDraftFilter('status', event.target.value)}
                    className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="all">전체</option>
                    <option value="PENDING">대기</option>
                    <option value="processing">처리 중</option>
                    <option value="REVIEW_REQUIRED">검토 필요</option>
                    <option value="COMPLETED">완료</option>
                    <option value="FAILED">실패</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium text-zinc-400">카테고리</span>
                  <select
                    value={draftFilters.category}
                    onChange={(event) => updateDraftFilter('category', event.target.value)}
                    className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="all">전체</option>
                    {categoryNames.map((categoryName) => (
                      <option key={categoryName} value={categoryName}>{categoryName}</option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium text-zinc-400">시작일</span>
                  <input
                    ref={dateFromInputRef}
                    type="date"
                    readOnly
                    value={draftFilters.dateFrom}
                    onClick={() => openDatePicker(dateFromInputRef.current)}
                    onChange={(event) => updateDraftFilter('dateFrom', event.target.value)}
                    className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium text-zinc-400">종료일</span>
                  <input
                    ref={dateToInputRef}
                    type="date"
                    readOnly
                    value={draftFilters.dateTo}
                    onClick={() => openDatePicker(dateToInputRef.current)}
                    onChange={(event) => updateDraftFilter('dateTo', event.target.value)}
                    className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-xs font-medium text-zinc-400">임베딩 모델</span>
                  <select
                    value={draftFilters.embeddingModel}
                    onChange={(event) => updateDraftFilter('embeddingModel', event.target.value)}
                    className="h-10 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-zinc-200 focus:outline-none focus:ring-2 focus:ring-primary/50"
                  >
                    <option value="all">전체</option>
                    {embeddingModels.map((model) => (
                      <option key={model.value} value={model.value}>{model.label}</option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/10"
                >
                  <RefreshCw className="h-4 w-4" />
                  초기화
                </button>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90"
                >
                  <Search className="h-4 w-4" />
                  검색
                </button>
              </div>
            </form>

            {/* Filters and controls */}
            <div className="flex flex-wrap items-center justify-end gap-4">
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

            {actionMessage && (
              <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-200">
                <CheckCircle2 className="h-4 w-4" />
                {actionMessage}
              </div>
            )}

            {actionError && (
              <div className="flex items-center gap-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                <AlertCircle className="h-4 w-4" />
                {actionError}
              </div>
            )}

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
                          <span
                            className="inline-flex items-center gap-1.5 ml-2 px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-zinc-200"
                            title={formatConfidence(doc.categoryConfidence) ? `분류 신뢰도 ${formatConfidence(doc.categoryConfidence)}` : undefined}
                          >
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
                      <div className="space-y-2">
                      {doc.status !== 'COMPLETED' && doc.status !== 'REVIEW_REQUIRED' && doc.status !== 'FAILED' && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openDocumentStatus(doc.id)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-colors text-sm text-blue-300"
                          >
                            <Activity className="w-4 h-4" />
                            처리 상태 보기
                          </button>
                          <button
                            type="button"
                            onClick={() => setCancelTarget(doc)}
                            disabled={!canCancelDocument(doc.status) || cancellingDocumentId === doc.id}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                            title={canCancelDocument(doc.status) ? '처리 취소' : '처리 중인 문서만 취소할 수 있습니다.'}
                          >
                            {cancellingDocumentId === doc.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-red-300" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-300" />
                            )}
                          </button>
                        </div>
                      )}

                      {doc.status === 'REVIEW_REQUIRED' && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/documents/${doc.id}/review`)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg transition-colors text-sm text-purple-300"
                          >
                            <Eye className="w-4 h-4" />
                            검토하기
                          </button>
                          <button
                            type="button"
                            onClick={() => setReprocessTarget(doc)}
                            disabled={!canReprocessDocument(doc.status) || reprocessingDocumentId === doc.id}
                            className="p-2 bg-yellow-500/10 hover:bg-yellow-500/20 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                            title="문서 재처리"
                          >
                            {reprocessingDocumentId === doc.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-yellow-300" />
                            ) : (
                              <RefreshCw className="w-4 h-4 text-yellow-300" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDownload(doc)}
                            disabled={downloadingDocumentId === doc.id}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                            title="원본 다운로드"
                          >
                            {downloadingDocumentId === doc.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-zinc-200" />
                            ) : (
                              <Download className="w-4 h-4 text-zinc-200" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(doc)}
                            disabled={!canDeleteDocument(doc.status) || deletingDocumentId === doc.id}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                            title="문서 삭제"
                          >
                            <Trash2 className="w-4 h-4 text-red-300" />
                          </button>
                        </div>
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
                            onClick={() => setReprocessTarget(doc)}
                            disabled={!canReprocessDocument(doc.status) || reprocessingDocumentId === doc.id}
                            title="문서 재처리"
                            className="p-2 bg-yellow-500/10 hover:bg-yellow-500/20 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {reprocessingDocumentId === doc.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-yellow-300" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5 text-yellow-300" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDownload(doc)}
                            disabled={downloadingDocumentId === doc.id}
                            title="원본 다운로드"
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {downloadingDocumentId === doc.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-200" />
                            ) : (
                              <Download className="w-3.5 h-3.5 text-zinc-200" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(doc)}
                            disabled={!canDeleteDocument(doc.status) || deletingDocumentId === doc.id}
                            title="문서 삭제"
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-300" />
                          </button>
                        </div>
                      )}

                      {doc.status === 'FAILED' && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setReprocessTarget(doc)}
                            disabled={!canReprocessDocument(doc.status) || reprocessingDocumentId === doc.id}
                            title="문서 재처리"
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 rounded-lg transition-colors text-sm text-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {reprocessingDocumentId === doc.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                            재처리
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDownload(doc)}
                            disabled={downloadingDocumentId === doc.id}
                            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                            title="원본 다운로드"
                          >
                            {downloadingDocumentId === doc.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-zinc-200" />
                            ) : (
                              <Download className="w-4 h-4 text-zinc-200" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(doc)}
                            disabled={!canDeleteDocument(doc.status) || deletingDocumentId === doc.id}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                            title="문서 삭제"
                          >
                            <Trash2 className="w-4 h-4 text-red-300" />
                          </button>
                        </div>
                      )}
                      </div>
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
                                    <span
                                      className="inline-block px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-zinc-300 mt-1"
                                      title={formatConfidence(doc.categoryConfidence) ? `분류 신뢰도 ${formatConfidence(doc.categoryConfidence)}` : undefined}
                                    >
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
                                      onClick={() => setReprocessTarget(doc)}
                                      disabled={!canReprocessDocument(doc.status) || reprocessingDocumentId === doc.id}
                                      className="p-2 hover:bg-yellow-500/10 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                      title="문서 재처리"
                                    >
                                      {reprocessingDocumentId === doc.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-yellow-300" />
                                      ) : (
                                        <RefreshCw className="w-4 h-4 text-yellow-300" />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleDownload(doc)}
                                      disabled={downloadingDocumentId === doc.id}
                                      className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                      title="원본 다운로드"
                                    >
                                      {downloadingDocumentId === doc.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-zinc-300" />
                                      ) : (
                                        <Download className="w-4 h-4 text-zinc-300" />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteTarget(doc)}
                                      disabled={!canDeleteDocument(doc.status) || deletingDocumentId === doc.id}
                                      className="p-2 hover:bg-red-500/10 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                      title="문서 삭제"
                                    >
                                      <Trash2 className="w-4 h-4 text-red-300" />
                                    </button>
                                  </>
                                )}
                                {doc.status === 'REVIEW_REQUIRED' && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/documents/${doc.id}/review`)}
                                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-lg transition-colors text-xs text-purple-300"
                                      title="검토하기"
                                    >
                                      <Eye className="w-4 h-4" />
                                      검토하기
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setReprocessTarget(doc)}
                                      disabled={!canReprocessDocument(doc.status) || reprocessingDocumentId === doc.id}
                                      className="p-2 hover:bg-yellow-500/10 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                      title="문서 재처리"
                                    >
                                      {reprocessingDocumentId === doc.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-yellow-300" />
                                      ) : (
                                        <RefreshCw className="w-4 h-4 text-yellow-300" />
                                      )}
                                    </button>
                                  </>
                                )}
                                {doc.status === 'FAILED' && (
                                  <button
                                    type="button"
                                    onClick={() => setReprocessTarget(doc)}
                                    disabled={!canReprocessDocument(doc.status) || reprocessingDocumentId === doc.id}
                                    className="p-2 hover:bg-yellow-500/10 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                    title="문서 재처리"
                                  >
                                    {reprocessingDocumentId === doc.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin text-yellow-300" />
                                    ) : (
                                      <RefreshCw className="w-4 h-4 text-yellow-300" />
                                    )}
                                  </button>
                                )}
                                {doc.status === 'PROCESSING' && (
                                  <button
                                    type="button"
                                    onClick={() => setCancelTarget(doc)}
                                    disabled={!canCancelDocument(doc.status) || cancellingDocumentId === doc.id}
                                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                    title="처리 취소"
                                  >
                                    {cancellingDocumentId === doc.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin text-red-300" />
                                    ) : (
                                      <XCircle className="w-4 h-4 text-red-300" />
                                    )}
                                  </button>
                                )}
                                {doc.status !== 'COMPLETED' && (
                                  <button
                                    type="button"
                                    onClick={() => void handleDownload(doc)}
                                    disabled={downloadingDocumentId === doc.id}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                    title="원본 다운로드"
                                  >
                                    {downloadingDocumentId === doc.id ? (
                                      <Loader2 className="w-4 h-4 animate-spin text-zinc-300" />
                                    ) : (
                                      <Download className="w-4 h-4 text-zinc-300" />
                                    )}
                                  </button>
                                )}
                                {doc.status !== 'COMPLETED' && (
                                  <button
                                    type="button"
                                    onClick={() => setDeleteTarget(doc)}
                                    disabled={!canDeleteDocument(doc.status) || deletingDocumentId === doc.id}
                                    className="p-2 hover:bg-red-500/10 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                                    title={canDeleteDocument(doc.status) ? '문서 삭제' : '처리 대기/진행 중인 문서는 삭제할 수 없습니다.'}
                                  >
                                    <Trash2 className="w-4 h-4 text-red-300" />
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

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#15151c] p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                <Trash2 className="h-5 w-5 text-red-300" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-white">문서 삭제 확인</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  <span className="font-medium text-white">{deleteTarget.name}</span> 문서를 삭제합니다.
                  삭제된 문서와 처리 데이터는 복구할 수 없습니다.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deletingDocumentId === deleteTarget.id}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmDelete()}
                disabled={deletingDocumentId === deleteTarget.id}
                className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingDocumentId === deleteTarget.id && <Loader2 className="h-4 w-4 animate-spin" />}
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {reprocessTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#15151c] p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-yellow-500/10">
                <RefreshCw className="h-5 w-5 text-yellow-300" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-white">문서 재처리 확인</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  <span className="font-medium text-white">{reprocessTarget.name}</span> 문서를 OCR 단계부터 다시 처리하시겠습니까?
                  기존 요약/임베딩 결과는 재생성됩니다.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setReprocessTarget(null)}
                disabled={reprocessingDocumentId === reprocessTarget.id}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmReprocess()}
                disabled={reprocessingDocumentId === reprocessTarget.id}
                className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reprocessingDocumentId === reprocessTarget.id && <Loader2 className="h-4 w-4 animate-spin" />}
                재처리
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#15151c] p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-300" />
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-white">처리 취소 확인</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  <span className="font-medium text-white">{cancelTarget.name}</span> 문서의 현재 처리를 취소하시겠습니까?
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                disabled={cancellingDocumentId === cancelTarget.id}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmCancel()}
                disabled={cancellingDocumentId === cancelTarget.id}
                className="inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {cancellingDocumentId === cancelTarget.id && <Loader2 className="h-4 w-4 animate-spin" />}
                처리 취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
