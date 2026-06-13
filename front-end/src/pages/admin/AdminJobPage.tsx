import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAdminQueues, getAdminTaskDetail, getAdminTasks, getAdminWorkers } from '../../api/admin';
import { Sidebar } from '../../components/common/Sidebar';
import type {
  AdminQueueItem,
  AdminTaskDetailResponse,
  AdminTaskListItemResponse,
  AdminWorkerItem,
  AdminWorkerStatus,
} from '../../types/admin';
import type { TaskStatus, TaskType } from '../../types/document';
import { getDocumentStatusPresentation, normalizeDocumentStatus, normalizeTaskStage } from '../../utils/documentStatus';
import {
  Clock,
  Menu,
  X,
  Search,
  Bell,
  Activity,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Eye,
  AlertTriangle,
  Cpu
} from 'lucide-react';

type FilterStatus = 'all' | 'running' | 'waiting' | 'completed' | 'failed';

interface AdminJobPageProps {
  onLogout?: () => void;
}

const PAGE_LIMIT = 20;
const AUTO_REFRESH_INTERVAL_MS = 30_000;

const taskTypes: TaskType[] = ['OCR', 'SUMMARY', 'EMBEDDING', 'RAG_INDEXING'];

const filterStatusMap: Record<Exclude<FilterStatus, 'all'>, TaskStatus> = {
  running: 'PROCESSING',
  waiting: 'PENDING',
  completed: 'COMPLETED',
  failed: 'FAILED',
};

const taskTypeColorClassNames: Record<TaskType, string> = {
  OCR: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  SUMMARY: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  EMBEDDING: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  RAG_INDEXING: 'bg-green-500/10 text-green-400 border-green-500/20',
};

const queueColorClassNames = [
  { text: 'text-blue-400', bg: 'bg-blue-500' },
  { text: 'text-purple-400', bg: 'bg-purple-500' },
  { text: 'text-yellow-400', bg: 'bg-yellow-500' },
  { text: 'text-green-400', bg: 'bg-green-500' },
];

function getApiErrorMessage(error: unknown, fallbackMessage = '작업 목록을 불러오지 못했습니다.'): string {
  const response = (error as { response?: { data?: { detail?: string; message?: string } } }).response;
  return response?.data?.detail ?? response?.data?.message ?? (error instanceof Error ? error.message : fallbackMessage);
}

function normalizeTaskStatus(status: string): TaskStatus {
  return normalizeDocumentStatus(status) as TaskStatus;
}

function normalizeTaskType(taskType: string): TaskType | null {
  const normalizedType = taskType.toUpperCase();
  return taskTypes.find((type) => type === normalizedType) ?? null;
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatDuration(startedAt?: string | null, completedAt?: string | null): string {
  if (!startedAt) return '-';

  const start = new Date(startedAt);
  const end = completedAt ? new Date(completedAt) : new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '-';

  const totalSeconds = Math.max(0, Math.floor((end.getTime() - start.getTime()) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function formatCount(value?: number | null): string {
  return typeof value === 'number' ? value.toLocaleString() : '-';
}

function getQueueTotal(queue: AdminQueueItem): number {
  return (
    (queue.pending_count ?? 0) +
    (queue.active_count ?? 0) +
    (queue.scheduled_count ?? 0) +
    (queue.reserved_count ?? 0)
  );
}

function getQueueColorClassNames(name: string): { text: string; bg: string } {
  const index = Math.abs([...name].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % queueColorClassNames.length;
  return queueColorClassNames[index];
}

function getActivityType(status: string): 'success' | 'error' | 'warning' | 'info' {
  const normalizedStatus = normalizeTaskStatus(status);

  if (normalizedStatus === 'COMPLETED') return 'success';
  if (normalizedStatus === 'FAILED') return 'error';
  if (normalizedStatus === 'PENDING') return 'warning';
  return 'info';
}

export function AdminJobPage({ onLogout }: AdminJobPageProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [tasks, setTasks] = useState<AdminTaskListItemResponse[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    total_pages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<AdminTaskDetailResponse | null>(null);
  const [detailErrorMessage, setDetailErrorMessage] = useState<string | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [queues, setQueues] = useState<AdminQueueItem[]>([]);
  const [queuesCheckedAt, setQueuesCheckedAt] = useState<string | null>(null);
  const [isQueuesLoading, setIsQueuesLoading] = useState(true);
  const [queuesErrorMessage, setQueuesErrorMessage] = useState<string | null>(null);
  const [workers, setWorkers] = useState<AdminWorkerItem[]>([]);
  const [isWorkersLoading, setIsWorkersLoading] = useState(true);
  const [workersErrorMessage, setWorkersErrorMessage] = useState<string | null>(null);

  const fetchTasks = useCallback(async (page: number, showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setErrorMessage(null);

    try {
      const response = await getAdminTasks({
        page,
        limit: PAGE_LIMIT,
        status: filterStatus === 'all' ? undefined : filterStatusMap[filterStatus],
        search: searchQuery.trim() || undefined,
        sort_by: 'updated_at',
        sort_order: 'desc',
      });

      setTasks(response.items);
      setPagination(response.pagination);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
      setTasks([]);
      setPagination((current) => ({ ...current, page, total: 0, total_pages: 0 }));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filterStatus, searchQuery]);

  const fetchQueues = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsQueuesLoading(true);
    }

    setQueuesErrorMessage(null);

    try {
      const response = await getAdminQueues();
      setQueues(response.queues);
      setQueuesCheckedAt(response.checked_at);
    } catch (error) {
      setQueuesErrorMessage(getApiErrorMessage(error, '큐 상태를 불러오지 못했습니다.'));
      setQueues([]);
      setQueuesCheckedAt(null);
    } finally {
      setIsQueuesLoading(false);
    }
  }, []);

  const fetchWorkers = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsWorkersLoading(true);
    }

    setWorkersErrorMessage(null);

    try {
      const response = await getAdminWorkers();
      setWorkers(response.workers);
    } catch (error) {
      setWorkersErrorMessage(getApiErrorMessage(error, 'Worker 상태를 불러오지 못했습니다.'));
      setWorkers([]);
    } finally {
      setIsWorkersLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchTasks(1, true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchTasks]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchQueues(true);
      void fetchWorkers(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchQueues, fetchWorkers]);

  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = window.setInterval(() => {
      void fetchTasks(pagination.page, false);
      void fetchQueues(false);
      void fetchWorkers(false);
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [autoRefresh, fetchQueues, fetchTasks, fetchWorkers, pagination.page]);

  const handleRefresh = () => {
    void fetchTasks(pagination.page, false);
    void fetchQueues(false);
    void fetchWorkers(false);
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || (pagination.total_pages > 0 && nextPage > pagination.total_pages)) return;
    void fetchTasks(nextPage, true);
  };

  const handleTaskDetail = async (taskId: string) => {
    setIsDetailLoading(true);
    setDetailErrorMessage(null);

    try {
      const detail = await getAdminTaskDetail(taskId);
      setSelectedTask(detail);
    } catch (error) {
      setDetailErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsDetailLoading(false);
    }
  };

  const stats = useMemo(() => {
    const countByStatus = tasks.reduce<Record<TaskStatus, number>>((counts, task) => {
      const status = normalizeTaskStatus(task.status);
      counts[status] += 1;
      return counts;
    }, { PENDING: 0, PROCESSING: 0, COMPLETED: 0, FAILED: 0 });

    const workerUsage = workers.length
      ? Math.round((workers.filter((worker) => worker.status === 'ACTIVE').length / workers.length) * 100)
      : 0;

    return [
      { label: '전체 작업', value: pagination.total.toLocaleString(), change: `page ${pagination.page}`, icon: Activity, color: 'primary' },
      { label: '실행 중', value: countByStatus.PROCESSING.toLocaleString(), change: '현재 페이지', icon: Loader2, color: 'blue', animate: countByStatus.PROCESSING > 0 },
      { label: '완료', value: countByStatus.COMPLETED.toLocaleString(), change: '현재 페이지', icon: CheckCircle2, color: 'green' },
      { label: '실패', value: countByStatus.FAILED.toLocaleString(), change: '현재 페이지', icon: XCircle, color: 'red' },
      { label: '대기 중', value: countByStatus.PENDING.toLocaleString(), change: '현재 페이지', icon: Clock, color: 'yellow' },
      { label: 'Worker 사용률', value: `${workerUsage}%`, change: 'ACTIVE 비율', icon: Cpu, color: 'purple' }
    ];
  }, [pagination.page, pagination.total, tasks, workers]);

  const failedJobs = useMemo(
    () => tasks.filter((task) => normalizeTaskStatus(task.status) === 'FAILED'),
    [tasks],
  );

  const activityLog = useMemo(() => (
    tasks.slice(0, 5).map((task) => ({
      id: task.id,
      time: formatDateTime(task.updated_at),
      message: task.message ?? task.error_message ?? `${task.task_type} / ${task.status}`,
      type: getActivityType(task.status),
    }))
  ), [tasks]);

  const getJobTypeColor = (type: string) => {
    const normalizedType = normalizeTaskType(type);
    return normalizedType ? taskTypeColorClassNames[normalizedType] : 'bg-white/5 text-gray-400 border-white/10';
  };

  const getStatusColor = (status: string, stage?: string | null) => {
    const presentation = getDocumentStatusPresentation(status, stage);
    return `${presentation.color} ${presentation.bgColor} ${presentation.borderColor}`;
  };

  const getStatusLabel = (status: string, stage?: string | null) => (
    getDocumentStatusPresentation(status, stage).label
  );

  const getWorkerStatusColor = (status: AdminWorkerStatus) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'IDLE': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'WARNING': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'OFFLINE': return 'bg-red-500/10 text-red-400 border-red-500/20';
    }
  };

  const getWorkerStatusLabel = (status: AdminWorkerStatus) => {
    switch (status) {
      case 'ACTIVE': return '정상';
      case 'IDLE': return '대기';
      case 'WARNING': return '경고';
      case 'OFFLINE': return '오프라인';
    }
  };

  const getWorkerStatusDotClassName = (status: AdminWorkerStatus) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-400 animate-pulse';
      case 'IDLE': return 'bg-yellow-400';
      case 'WARNING': return 'bg-orange-400';
      case 'OFFLINE': return 'bg-red-400';
    }
  };

  const getWorkerLoad = (worker: AdminWorkerItem) => {
    const activeCount = worker.active_task_count ?? 0;
    const totalCount = activeCount + (worker.reserved_task_count ?? 0) + (worker.scheduled_task_count ?? 0);
    return totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;
  };

  const getActivityIcon = (type: 'success' | 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />;
      case 'error': return <XCircle className="w-3.5 h-3.5 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />;
      default: return <Activity className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0a0f] flex">
      {/* Sidebar */}
      <Sidebar
        variant="admin"
        sidebarOpen={sidebarOpen}
        onLogout={onLogout}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Top navigation */}
        <header className="h-16 bg-[#111116]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors lg:hidden"
            >
              {sidebarOpen ? <X className="w-5 h-5 text-gray-400" /> : <Menu className="w-5 h-5 text-gray-400" />}
            </button>

            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="search"
                placeholder="작업 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 lg:w-96 pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                autoRefresh
                  ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                  : 'bg-white/5 text-gray-400 border border-white/10'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              <span className="text-sm">자동 새로고침</span>
            </button>

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
              className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white text-sm"
            >
              로그아웃
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-[1800px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">작업 모니터링</h2>
                <p className="text-gray-400">실시간 작업 상태 및 큐 관리</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-green-400 text-sm font-medium">실시간 모니터링</span>
                </div>
              </div>
            </div>

            {/* Stats */}
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
                            stat.color === 'blue' ? 'text-blue-400 ' + (stat.animate ? 'animate-spin' : '') :
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
              {/* Job table */}
              <div className="xl:col-span-3 space-y-4">
                {/* Filters */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterStatus('all')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filterStatus === 'all'
                        ? 'bg-primary text-white'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    전체
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus('running')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filterStatus === 'running'
                        ? 'bg-primary text-white'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    실행 중
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus('waiting')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filterStatus === 'waiting'
                        ? 'bg-primary text-white'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    대기
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus('completed')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filterStatus === 'completed'
                        ? 'bg-primary text-white'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
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
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    실패
                  </button>
                </div>

                {errorMessage && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">작업 목록 오류</p>
                      <p className="mt-1 text-sm text-red-300/80">{errorMessage}</p>
                    </div>
                  </div>
                )}

                {/* Table */}
                <div className="bg-[#111116] border border-white/10 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Job ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">문서</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">타입</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">진행률</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">상태</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">Worker</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase">시간</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase">액션</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {isLoading ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-12 text-center">
                              <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />
                              <p className="text-sm text-gray-400">작업 목록을 불러오는 중입니다.</p>
                            </td>
                          </tr>
                        ) : tasks.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="px-6 py-12 text-center">
                              <Activity className="mx-auto mb-3 h-6 w-6 text-gray-500" />
                              <p className="text-sm font-medium text-white">표시할 작업이 없습니다.</p>
                              <p className="mt-1 text-sm text-gray-500">검색어나 상태 필터를 변경하거나 새로고침해 주세요.</p>
                            </td>
                          </tr>
                        ) : tasks.map((job) => {
                          const normalizedStatus = normalizeTaskStatus(job.status);
                          const statusPresentation = getDocumentStatusPresentation(job.status, job.stage);
                          const normalizedStage = normalizeTaskStage(job.stage);

                          return (
                            <tr key={job.id} className="hover:bg-white/5 transition-colors">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <code className="text-primary text-xs font-mono">{job.id}</code>
                              </td>
                              <td className="px-6 py-4">
                                <div className="min-w-0 max-w-xs">
                                  <p className="text-white text-sm font-medium truncate">{job.document.file_name}</p>
                                  <p className="text-gray-400 text-xs truncate">{job.owner.name || job.owner.email}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2.5 py-1 border rounded-lg text-xs font-medium ${getJobTypeColor(job.task_type)}`}>
                                  {job.task_type}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="w-32">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-gray-400">{job.progress}%</span>
                                  </div>
                                  <div className="w-full bg-white/5 rounded-full h-1.5">
                                    <div
                                      className={`${statusPresentation.progressColor} h-1.5 rounded-full transition-all`}
                                      style={{ width: `${Math.max(0, Math.min(100, job.progress))}%` }}
                                    />
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">{job.stage ?? normalizedStage ?? '-'}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-xs font-medium ${getStatusColor(job.status, job.stage)}`}>
                                  {normalizedStatus === 'PROCESSING' && <Loader2 className="w-3 h-3 animate-spin" />}
                                  {normalizedStatus === 'COMPLETED' && <CheckCircle2 className="w-3 h-3" />}
                                  {normalizedStatus === 'FAILED' && <XCircle className="w-3 h-3" />}
                                  {normalizedStatus === 'PENDING' && <Clock className="w-3 h-3" />}
                                  {getStatusLabel(job.status, job.stage)}
                                </span>
                                {job.message && (
                                  <p className="text-xs text-gray-400 mt-1 max-w-xs truncate">{job.message}</p>
                                )}
                                {job.error_message && (
                                  <p className="text-xs text-red-400/80 mt-1 max-w-xs truncate">{job.error_message}</p>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                {normalizeTaskType(job.task_type) ? `${job.task_type.toLowerCase()}-worker` : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm">
                                  <p className="text-white">{formatDuration(job.started_at, job.completed_at)}</p>
                                  <p className="text-gray-500 text-xs">{formatDateTime(job.created_at)}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {normalizedStatus === 'FAILED' && (
                                    <button
                                      type="button"
                                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                      title="재시도"
                                      disabled
                                    >
                                      <RefreshCw className="w-4 h-4 text-yellow-400" />
                                    </button>
                                  )}
                                  {normalizedStatus === 'PROCESSING' && (
                                    <button
                                      type="button"
                                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                      title="취소"
                                      disabled
                                    >
                                      <XCircle className="w-4 h-4 text-red-400" />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => void handleTaskDetail(job.id)}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                    title="상세보기"
                                  >
                                    <Eye className="w-4 h-4 text-gray-400" />
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
                    {pagination.total.toLocaleString()}개 중 {tasks.length.toLocaleString()}개 표시
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

                {(selectedTask || detailErrorMessage || isDetailLoading) && (
                  <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                        <Eye className="w-5 h-5 text-primary" />
                        작업 상세
                      </h3>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTask(null);
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
                    ) : selectedTask && (
                      <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
                        <div>
                          <dt className="text-gray-500">ID</dt>
                          <dd className="font-mono text-primary">{selectedTask.id}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">문서</dt>
                          <dd className="text-white">{selectedTask.document.file_name}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">task_type</dt>
                          <dd className="text-white">{selectedTask.task_type}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">status</dt>
                          <dd className="text-white">{getStatusLabel(selectedTask.status, selectedTask.stage)}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">stage</dt>
                          <dd className="text-white">{selectedTask.stage ?? '-'}</dd>
                        </div>
                        <div>
                          <dt className="text-gray-500">progress</dt>
                          <dd className="text-white">{selectedTask.progress}%</dd>
                        </div>
                        <div className="md:col-span-2">
                          <dt className="text-gray-500">message</dt>
                          <dd className="text-white">{selectedTask.message ?? '-'}</dd>
                        </div>
                        <div className="md:col-span-2">
                          <dt className="text-gray-500">error_message</dt>
                          <dd className="text-red-300">{selectedTask.error_message ?? '-'}</dd>
                        </div>
                      </dl>
                    )}
                  </div>
                )}

                {/* Worker monitoring */}
                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-primary" />
                    Worker 상태
                  </h3>
                  {workersErrorMessage && (
                    <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-red-300">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p className="text-sm">{workersErrorMessage}</p>
                    </div>
                  )}
                  {isWorkersLoading ? (
                    <div className="rounded-lg bg-white/5 p-6 text-center">
                      <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-primary" />
                      <p className="text-sm text-gray-400">Worker 상태를 불러오는 중입니다.</p>
                    </div>
                  ) : workers.length === 0 && !workersErrorMessage ? (
                    <div className="rounded-lg bg-white/5 p-6 text-center">
                      <Cpu className="mx-auto mb-3 h-5 w-5 text-gray-500" />
                      <p className="text-sm font-medium text-white">표시할 Worker가 없습니다.</p>
                      <p className="mt-1 text-sm text-gray-500">Celery Worker 응답을 기다리거나 새로고침해 주세요.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {workers.map((worker) => {
                        const workerLoad = getWorkerLoad(worker);
                        const currentQueues = worker.current_queues?.length ? worker.current_queues.join(', ') : '-';

                        return (
                          <div
                            key={worker.id}
                            className={`p-4 border rounded-lg ${getWorkerStatusColor(worker.status)}`}
                          >
                            <div className="flex items-center justify-between gap-3 mb-3">
                              <div className="min-w-0">
                                <h4 className="font-medium text-sm truncate">{worker.name}</h4>
                                <p className="mt-1 text-xs opacity-80">{getWorkerStatusLabel(worker.status)}</p>
                              </div>
                              <div className={`w-2 h-2 shrink-0 rounded-full ${getWorkerStatusDotClassName(worker.status)}`} />
                            </div>
                            <p className="text-xs opacity-80 mb-2 truncate" title={currentQueues}>
                              {currentQueues}
                            </p>
                            <div className="space-y-2">
                              <div>
                                <div className="flex justify-between text-xs mb-1">
                                  <span className="opacity-80">활성 비율</span>
                                  <span className="font-medium">{workerLoad}%</span>
                                </div>
                                <div className="w-full bg-black/20 rounded-full h-1.5">
                                  <div
                                    className="h-1.5 rounded-full"
                                    style={{
                                      width: `${workerLoad}%`,
                                      backgroundColor: worker.status === 'ACTIVE' ? 'rgb(74 222 128)' : 'rgb(250 204 21)'
                                    }}
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-xs opacity-80">
                                <span>active {formatCount(worker.active_task_count)}</span>
                                <span>reserved {formatCount(worker.reserved_task_count)}</span>
                                <span>scheduled {formatCount(worker.scheduled_task_count)}</span>
                              </div>
                              <p className="text-xs opacity-60">처리: {formatCount(worker.processed_count)}</p>
                              <p className="text-xs opacity-60">확인: {formatDateTime(worker.checked_at)}</p>
                              {worker.details && (
                                <p className="line-clamp-2 text-xs opacity-70">{worker.details}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Right panel */}
              <div className="space-y-6">
                {/* Failed jobs */}
                {failedJobs.length > 0 && (
                  <div className="bg-[#111116] border border-red-500/20 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <AlertTriangle className="w-5 h-5 text-red-400" />
                      <h3 className="text-white font-semibold text-lg">실패한 작업</h3>
                    </div>
                    <div className="space-y-3">
                      {failedJobs.map((job) => (
                        <div
                          key={job.id}
                          className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
                        >
                          <p className="text-white text-sm font-medium mb-1 line-clamp-1">{job.document.file_name}</p>
                          <p className="text-red-400/80 text-xs mb-2 line-clamp-2">{job.error_message ?? job.message ?? '-'}</p>
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-gray-400">{formatDateTime(job.updated_at)}</span>
                            <span className={`px-2 py-0.5 rounded ${getJobTypeColor(job.task_type)}`}>
                              {job.task_type}
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled
                            className="w-full py-1.5 px-3 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-xs transition-colors flex items-center justify-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <RefreshCw className="w-3 h-3" />
                            재시도
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Queue monitoring */}
                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-4">큐 상태</h3>
                  {queuesErrorMessage && (
                    <div className="mb-4 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-red-300">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p className="text-sm">{queuesErrorMessage}</p>
                    </div>
                  )}
                  {isQueuesLoading ? (
                    <div className="rounded-lg bg-white/5 p-6 text-center">
                      <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-primary" />
                      <p className="text-sm text-gray-400">큐 상태를 불러오는 중입니다.</p>
                    </div>
                  ) : queues.length === 0 && !queuesErrorMessage ? (
                    <div className="rounded-lg bg-white/5 p-6 text-center">
                      <Activity className="mx-auto mb-3 h-5 w-5 text-gray-500" />
                      <p className="text-sm font-medium text-white">표시할 큐가 없습니다.</p>
                      <p className="mt-1 text-sm text-gray-500">Queue 응답을 기다리거나 새로고침해 주세요.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {queues.map((queue) => {
                        const classNames = getQueueColorClassNames(queue.name);
                        const totalCount = getQueueTotal(queue);
                        const checkedAt = queue.checked_at ?? queuesCheckedAt;

                        return (
                          <div key={queue.name} className="p-3 bg-white/5 rounded-lg">
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <span className="min-w-0 truncate text-white text-sm font-medium">{queue.name}</span>
                              <span className={`${classNames.text} text-sm font-bold`}>
                                {formatCount(queue.pending_count)}
                              </span>
                            </div>
                            <div className="w-full bg-white/5 rounded-full h-1.5">
                              <div
                                className={`${classNames.bg} h-1.5 rounded-full transition-all`}
                                style={{ width: `${Math.min(100, (totalCount / PAGE_LIMIT) * 100)}%` }}
                              />
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-400">
                              <span>pending {formatCount(queue.pending_count)}</span>
                              <span>active {formatCount(queue.active_count)}</span>
                              <span>scheduled {formatCount(queue.scheduled_count)}</span>
                              <span>reserved {formatCount(queue.reserved_count)}</span>
                            </div>
                            {typeof queue.failed_count === 'number' && (
                              <p className="mt-2 text-xs text-red-300">failed {formatCount(queue.failed_count)}</p>
                            )}
                            {typeof queue.oldest_task_age_seconds === 'number' && (
                              <p className="mt-2 text-xs text-gray-500">oldest {queue.oldest_task_age_seconds}s</p>
                            )}
                            <p className="mt-2 text-xs text-gray-500">확인: {formatDateTime(checkedAt)}</p>
                            {queue.details && (
                              <p className="mt-2 line-clamp-2 text-xs text-yellow-300/80">{queue.details}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Live activity */}
                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    실시간 활동
                  </h3>
                  <div className="space-y-3">
                    {activityLog.length === 0 ? (
                      <p className="rounded-lg bg-white/5 p-3 text-sm text-gray-500">최근 작업 활동이 없습니다.</p>
                    ) : activityLog.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-start gap-3 p-3 bg-white/5 rounded-lg"
                      >
                        <div className="mt-0.5">
                          {getActivityIcon(log.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-300 text-sm">{log.message}</p>
                          <p className="text-gray-500 text-xs mt-1">{log.time}</p>
                        </div>
                      </div>
                    ))}
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
