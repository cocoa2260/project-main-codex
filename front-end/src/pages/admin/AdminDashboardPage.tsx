import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { getAdminDashboardSummary, getAdminSystemHealth } from '../../api/admin';
import { Sidebar } from '../../components/common/Sidebar';
import { usePersistentSidebar } from '../../hooks/usePersistentSidebar';
import type {
  AdminDashboardSummaryResponse,
  AdminHealthService,
  AdminHealthServiceStatus,
  AdminRecentEvent,
} from '../../types/admin';
import type { TaskStatus, TaskType } from '../../types/document';
import { getDocumentStatusPresentation, normalizeDocumentStatus } from '../../utils/documentStatus';
import {
  FileText,
  Clock,
  Menu,
  X,
  Search,
  Bell,
  Users,
  Activity,
  CheckCircle2,
  XCircle,
  Loader2,
  Database,
  Zap,
  TrendingUp,
  RefreshCw,
  PlayCircle,
  FileWarning,
  AlertTriangle,
  Terminal,
  Cpu,
  HardDrive,
  Layers,
  LogOut,
} from 'lucide-react';

interface SystemService {
  key: string;
  name: string;
  status: AdminHealthServiceStatus;
  icon: LucideIcon;
  details: string;
  checkedAt: string;
}

interface Job {
  id: string;
  documentName: string;
  type: TaskType;
  progress: number;
  user: string;
  status: TaskStatus;
  startedAt: string;
}

interface AdminDashboardPageProps {
  onLogout?: () => void;
}

const AUTO_REFRESH_INTERVAL_MS = 30_000;
const taskTypes: TaskType[] = ['OCR', 'SUMMARY', 'EMBEDDING', 'RAG_INDEXING'];

const healthServiceOrder = ['api', 'postgresql', 'redis', 'ollama', 'storage', 'celery'] as const;

const healthServicePresentation: Record<typeof healthServiceOrder[number], { name: string; icon: LucideIcon }> = {
  api: { name: 'API', icon: Activity },
  postgresql: { name: 'PostgreSQL', icon: Database },
  redis: { name: 'Redis', icon: Zap },
  ollama: { name: 'Ollama', icon: Cpu },
  storage: { name: 'Storage', icon: HardDrive },
  celery: { name: 'Celery', icon: Layers },
};

function getApiErrorMessage(error: unknown): string {
  const response = (error as { response?: { data?: { detail?: string; message?: string } } }).response;
  return response?.data?.detail ?? response?.data?.message ?? (error instanceof Error ? error.message : '관리자 대시보드 정보를 불러오지 못했습니다.');
}

function normalizeHealthServiceKey(service: Pick<AdminHealthService, 'key' | 'name'>): typeof healthServiceOrder[number] | null {
  const value = `${service.key} ${service.name}`.toLowerCase();
  if (value.includes('api')) return 'api';
  if (value.includes('postgres') || value.includes('postgresql')) return 'postgresql';
  if (value.includes('redis')) return 'redis';
  if (value.includes('ollama')) return 'ollama';
  if (value.includes('storage') || value.includes('store')) return 'storage';
  if (value.includes('celery')) return 'celery';
  return null;
}

function normalizeHealthServiceStatus(status?: string | null): AdminHealthServiceStatus {
  const normalizedStatus = status?.toUpperCase();
  if (normalizedStatus === 'HEALTHY' || normalizedStatus === 'WARNING' || normalizedStatus === 'ERROR' || normalizedStatus === 'OFFLINE') {
    return normalizedStatus;
  }

  return 'OFFLINE';
}

function normalizeTaskStatus(status?: string | null): TaskStatus {
  const normalizedStatus = normalizeDocumentStatus(status);
  if (normalizedStatus === 'ALL') return 'PENDING';
  return normalizedStatus === 'REVIEW_REQUIRED' ? 'PROCESSING' : normalizedStatus;
}

function normalizeTaskType(taskType?: string | null): TaskType | null {
  const normalizedType = taskType?.toUpperCase();
  return taskTypes.find((type) => type === normalizedType) ?? null;
}

function getCount<T extends string>(counts: Partial<Record<T, number>> | undefined, key: T): number {
  return counts?.[key] ?? 0;
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

function formatRelativeTime(value?: string | null): string {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const diffSeconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSeconds < 60) return '방금';

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}분 전`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;

  return formatDateTime(value);
}

export function AdminDashboardPage({ onLogout }: AdminDashboardPageProps) {
  const [sidebarOpen, setSidebarOpen] = usePersistentSidebar();
  const [searchQuery, setSearchQuery] = useState('');
  const [summary, setSummary] = useState<AdminDashboardSummaryResponse | null>(null);
  const [healthServices, setHealthServices] = useState<AdminHealthService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isHealthLoading, setIsHealthLoading] = useState(true);
  const [isHealthRefreshing, setIsHealthRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [healthErrorMessage, setHealthErrorMessage] = useState<string | null>(null);

  const fetchDashboardSummary = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setErrorMessage(null);

    try {
      const response = await getAdminDashboardSummary();
      setSummary(response);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
      setSummary(null);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const fetchSystemHealth = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsHealthLoading(true);
    } else {
      setIsHealthRefreshing(true);
    }

    setHealthErrorMessage(null);

    try {
      const response = await getAdminSystemHealth();
      setHealthServices(response.services);
    } catch (error) {
      setHealthErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsHealthLoading(false);
      setIsHealthRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchDashboardSummary(true);
      void fetchSystemHealth(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchDashboardSummary, fetchSystemHealth]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchDashboardSummary(false);
      void fetchSystemHealth(false);
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [fetchDashboardSummary, fetchSystemHealth]);

  const handleRefresh = () => {
    void fetchDashboardSummary(false);
    void fetchSystemHealth(false);
  };

  const taskStatusCounts = summary?.tasks.by_status;
  const documentStatusCounts = summary?.documents.by_status;
  const processingTasks = getCount(taskStatusCounts, 'PROCESSING');
  const failedTasks = getCount(taskStatusCounts, 'FAILED');
  const pendingTasks = getCount(taskStatusCounts, 'PENDING');
  const completedTasks = getCount(taskStatusCounts, 'COMPLETED');
  const processingDocuments = getCount(documentStatusCounts, 'PROCESSING') + getCount(documentStatusCounts, 'REVIEW_REQUIRED');
  const completedDocuments = getCount(documentStatusCounts, 'COMPLETED');
  const failedDocuments = getCount(documentStatusCounts, 'FAILED');
  const taskTotal = summary?.tasks.total ?? 0;
  const documentTotal = summary?.documents.total ?? 0;
  const processingTaskRate = taskTotal > 0 ? Math.round((processingTasks / taskTotal) * 100) : 0;
  const completedTaskRate = taskTotal > 0 ? Math.round((completedTasks / taskTotal) * 100) : 0;
  const completedDocumentRate = documentTotal > 0 ? Math.round((completedDocuments / documentTotal) * 100) : 0;
  const pendingTaskRate = taskTotal > 0 ? Math.round((pendingTasks / taskTotal) * 100) : 0;

  const hasDashboardData = Boolean(summary) && (
    (summary?.users.total_users ?? 0) > 0
    || (summary?.documents.total ?? 0) > 0
    || (summary?.tasks.total ?? 0) > 0
    || (summary?.recent_events.length ?? 0) > 0
  );

  const stats = [
    {
      label: '전체 사용자',
      value: (summary?.users.total_users ?? 0).toLocaleString(),
      change: `관리자 ${(summary?.users.admin_users ?? 0).toLocaleString()}`,
      trend: 'up' as const,
      icon: Users,
      color: 'primary'
    },
    {
      label: '전체 문서',
      value: (summary?.documents.total ?? 0).toLocaleString(),
      change: `오늘 ${(summary?.documents.uploaded_today ?? 0).toLocaleString()}`,
      trend: 'up' as const,
      icon: FileText,
      color: 'blue'
    },
    {
      label: '처리 중 작업',
      value: processingTasks.toLocaleString(),
      change: `${processingDocuments.toLocaleString()} 문서`,
      trend: 'up' as const,
      icon: Loader2,
      color: 'purple'
    },
    {
      label: '실패한 작업',
      value: failedTasks.toLocaleString(),
      change: `${failedDocuments.toLocaleString()} 문서`,
      trend: 'up' as const,
      icon: XCircle,
      color: 'red'
    },
    {
      label: '대기 큐',
      value: pendingTasks.toLocaleString(),
      change: `${(summary?.tasks.total ?? 0).toLocaleString()} 전체`,
      trend: 'up' as const,
      icon: Clock,
      color: 'yellow'
    },
    {
      label: '완료 작업',
      value: completedTasks.toLocaleString(),
      change: `${(summary?.documents.uploaded_today ?? 0).toLocaleString()} 오늘 문서`,
      trend: 'up' as const,
      icon: TrendingUp,
      color: 'green'
    }
  ];

  const systemServices: SystemService[] = useMemo(() => {
    const servicesByKey = new Map<typeof healthServiceOrder[number], AdminHealthService>();
    healthServices.forEach((service) => {
      const normalizedKey = normalizeHealthServiceKey(service);
      if (normalizedKey) {
        servicesByKey.set(normalizedKey, service);
      }
    });

    return healthServiceOrder.map((key) => {
      const service = servicesByKey.get(key);
      const presentation = healthServicePresentation[key];
      const status = normalizeHealthServiceStatus(service?.status);

      return {
        key,
        name: presentation.name,
        status,
        icon: presentation.icon,
        details: service?.details ?? (status === 'HEALTHY' ? '정상' : (healthErrorMessage ? '상태를 불러오지 못했습니다.' : '상태 확인 대기 중')),
        checkedAt: formatDateTime(service?.checked_at),
      };
    });
  }, [healthErrorMessage, healthServices]);

  const activeJobs: Job[] = useMemo(() => (
    (summary?.recent_events ?? [])
      .map((event) => {
        const taskType = normalizeTaskType(event.task_type);
        if (!taskType) return null;

        return {
          id: event.id,
          documentName: event.document_name ?? event.message,
          type: taskType,
          progress: normalizeTaskStatus(event.status) === 'COMPLETED' ? 100 : 0,
          user: event.event_type,
          status: normalizeTaskStatus(event.status),
          startedAt: formatRelativeTime(event.occurred_at),
        };
      })
      .filter((job): job is Job => Boolean(job))
      .filter((job) => job.status === 'PROCESSING' || job.status === 'PENDING' || job.status === 'FAILED')
      .slice(0, 4)
  ), [summary]);

  const recentEvents = summary?.recent_events ?? [];

  const resourceUsage = [
    { label: '처리 중 작업', value: processingTaskRate, icon: Cpu, color: 'bg-blue-500', textColor: 'text-blue-400' },
    { label: '작업 완료율', value: completedTaskRate, icon: Activity, color: 'bg-green-500', textColor: 'text-green-400' },
    { label: '문서 완료율', value: completedDocumentRate, icon: HardDrive, color: 'bg-purple-500', textColor: 'text-purple-400' },
    { label: '큐 사용률', value: pendingTaskRate, icon: Database, color: 'bg-yellow-500', textColor: 'text-yellow-400' },
  ];

  const alerts = [
    failedTasks > 0
      ? {
        id: 'failed-tasks',
        icon: FileWarning,
        title: '실패한 작업 감지',
        message: `${failedTasks.toLocaleString()}개 작업 실패`,
        className: 'bg-red-500/10 border-red-500/20',
        textClassName: 'text-red-400',
      }
      : null,
    failedDocuments > 0
      ? {
        id: 'failed-documents',
        icon: AlertTriangle,
        title: '실패한 문서 감지',
        message: `${failedDocuments.toLocaleString()}개 문서 실패`,
        className: 'bg-yellow-500/10 border-yellow-500/20',
        textClassName: 'text-yellow-400',
      }
      : null,
    pendingTasks > 0
      ? {
        id: 'pending-tasks',
        icon: Clock,
        title: '대기 작업 존재',
        message: `${pendingTasks.toLocaleString()}개 작업 대기 중`,
        className: 'bg-yellow-500/10 border-yellow-500/20',
        textClassName: 'text-yellow-400',
      }
      : null,
  ].filter((alert): alert is NonNullable<typeof alert> => Boolean(alert));

  const getStatusColor = (status: AdminHealthServiceStatus) => {
    switch (status) {
      case 'HEALTHY':
        return 'bg-green-500/10 border-green-500/20 text-green-400';
      case 'WARNING':
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
      case 'ERROR':
        return 'bg-red-500/10 border-red-500/20 text-red-400';
      case 'OFFLINE':
        return 'bg-gray-500/10 border-gray-500/20 text-gray-400';
    }
  };

  const getJobTypeLabel = (type: TaskType) => {
    switch (type) {
      case 'OCR':
        return 'OCR 처리';
      case 'SUMMARY':
        return 'AI 요약';
      case 'EMBEDDING':
        return '임베딩';
      case 'RAG_INDEXING':
        return 'RAG 인덱싱';
    }
  };

  const getJobTypeColor = (type: TaskType) => {
    switch (type) {
      case 'OCR':
        return 'bg-blue-500/10 text-blue-400';
      case 'SUMMARY':
        return 'bg-purple-500/10 text-purple-400';
      case 'EMBEDDING':
        return 'bg-yellow-500/10 text-yellow-400';
      case 'RAG_INDEXING':
        return 'bg-green-500/10 text-green-400';
    }
  };

  const getEventIcon = (event: AdminRecentEvent) => {
    switch (normalizeTaskStatus(event.status)) {
      case 'COMPLETED':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'FAILED':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'PENDING':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      default:
        return <Activity className="w-4 h-4 text-blue-400" />;
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0a0f] flex">
      {/* Sidebar */}
      <Sidebar
        variant="admin"
        sidebarOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((open) => !open)}
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
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5 text-gray-400" /> : <Menu className="w-5 h-5 text-gray-400" />}
            </button>

            {/* System status badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg ${
              errorMessage || healthErrorMessage
                ? 'bg-red-500/10 border-red-500/20'
                : 'bg-green-500/10 border-green-500/20'
            }`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${errorMessage || healthErrorMessage ? 'bg-red-400' : 'bg-green-400'}`} />
              <span className={`text-sm font-medium ${errorMessage || healthErrorMessage ? 'text-red-400' : 'text-green-400'}`}>
                {errorMessage || healthErrorMessage ? 'Admin API Error' : isLoading || isHealthLoading ? 'Loading Admin APIs' : 'Admin APIs Connected'}
              </span>
            </div>

            {/* Search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="search"
                placeholder="검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
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

        {/* Dashboard content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-[1800px] mx-auto space-y-6">
            {/* Header */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">관리자 대시보드</h2>
                  <p className="text-gray-400">AI 문서 자동화 플랫폼 통합 관리</p>
                </div>
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isLoading || isRefreshing || isHealthLoading || isHealthRefreshing}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed border border-white/10 rounded-lg transition-colors text-gray-300 text-sm"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing || isHealthRefreshing ? 'animate-spin' : ''}`} />
                  새로고침
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <p className="text-red-400 font-medium">대시보드 데이터를 불러오지 못했습니다.</p>
                    <p className="text-red-400/80 text-sm mt-1">{errorMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {!isLoading && !errorMessage && !hasDashboardData && (
              <div className="p-4 bg-white/5 border border-white/10 rounded-xl">
                <div className="flex items-start gap-3">
                  <Activity className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">아직 집계된 대시보드 데이터가 없습니다.</p>
                    <p className="text-gray-400 text-sm mt-1">사용자, 문서 또는 작업이 생성되면 이 화면에 표시됩니다.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Stats cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {stats.map((stat, idx) => {
                const Icon = stat.icon;
                const isPositive = stat.trend === 'up' && !stat.label.includes('실패');

                return (
                  <div key={idx} className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-blue-500 rounded-xl opacity-0 group-hover:opacity-20 blur transition-opacity" />
                    <div className="relative bg-[#111116] border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className={`p-2 rounded-lg ${
                          stat.color === 'primary' ? 'bg-primary/10' :
                          stat.color === 'blue' ? 'bg-blue-500/10' :
                          stat.color === 'purple' ? 'bg-purple-500/10' :
                          stat.color === 'red' ? 'bg-red-500/10' :
                          stat.color === 'yellow' ? 'bg-yellow-500/10' :
                          'bg-green-500/10'
                        }`}>
                          <Icon className={`w-5 h-5 ${
                            stat.color === 'primary' ? 'text-primary' :
                            stat.color === 'blue' ? 'text-blue-400' :
                            stat.color === 'purple' ? 'text-purple-400 animate-spin' :
                            stat.color === 'red' ? 'text-red-400' :
                            stat.color === 'yellow' ? 'text-yellow-400' :
                            'text-green-400'
                          }`} />
                        </div>
                        <span className={`text-xs font-medium ${
                          isPositive ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {stat.change}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold text-white">{isLoading ? '-' : stat.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* System status */}
              <div className="xl:col-span-2 space-y-6">
                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white font-semibold text-lg">시스템 상태</h3>
                    <button
                      type="button"
                      onClick={handleRefresh}
                      disabled={isLoading || isRefreshing || isHealthLoading || isHealthRefreshing}
                      className="p-2 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      <RefreshCw className={`w-4 h-4 text-gray-400 ${isHealthRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {healthErrorMessage && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <XCircle className="w-4 h-4 text-red-400 mt-0.5" />
                        <div>
                          <p className="text-red-400 text-sm font-medium">시스템 헬스 정보를 불러오지 못했습니다.</p>
                          <p className="text-red-400/80 text-xs mt-1">{healthErrorMessage}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {systemServices.map((service) => {
                      const ServiceIcon = service.icon;

                      return (
                        <div
                          key={service.name}
                          className={`p-4 border rounded-lg ${getStatusColor(service.status)}`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <ServiceIcon className="w-5 h-5" />
                            {isHealthLoading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <div className={`w-2 h-2 rounded-full ${
                              service.status === 'HEALTHY' ? 'bg-green-400 animate-pulse' :
                              service.status === 'WARNING' ? 'bg-yellow-400 animate-pulse' :
                              service.status === 'ERROR' ? 'bg-red-400 animate-pulse' :
                              'bg-gray-400'
                            }`} />
                            )}
                          </div>
                          <h4 className="font-medium mb-1">{service.name}</h4>
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="opacity-80">Status</span>
                            <span className="font-semibold">{service.status}</span>
                          </div>
                          <p className="text-xs opacity-80">{service.details}</p>
                          <p className="text-xs opacity-60 mt-1">Checked: {service.checkedAt}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Active jobs */}
                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white font-semibold text-lg">활성 작업</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">실시간 모니터링</span>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {isLoading && (
                      <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                        <div className="flex items-center gap-3 text-gray-400 text-sm">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          활성 작업을 불러오는 중입니다.
                        </div>
                      </div>
                    )}
                    {!isLoading && activeJobs.length === 0 && (
                      <div className="p-4 bg-white/5 border border-white/10 rounded-lg text-gray-400 text-sm">
                        현재 표시할 활성 작업이 없습니다.
                      </div>
                    )}
                    {activeJobs.map((job) => {
                      const statusPresentation = getDocumentStatusPresentation(job.status);

                      return (
                        <div
                          key={job.id}
                          className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                <h4 className="text-white font-medium text-sm truncate">
                                  {job.documentName}
                                </h4>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs">
                                <span className={`px-2 py-1 rounded ${getJobTypeColor(job.type)}`}>
                                  {getJobTypeLabel(job.type)}
                                </span>
                                <span className={`px-2 py-1 border rounded ${statusPresentation.color} ${statusPresentation.bgColor} ${statusPresentation.borderColor}`}>
                                  {statusPresentation.label}
                                </span>
                                <span className="text-gray-400">• {job.user}</span>
                                <span className="text-gray-500">• {job.startedAt}</span>
                              </div>
                            </div>

                            {job.status === 'PROCESSING' ? (
                              <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
                            ) : job.status === 'FAILED' ? (
                              <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                            ) : (
                              <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                            )}
                          </div>

                          {job.status === 'PROCESSING' && (
                            <div>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-gray-400">진행률</span>
                                <span className="text-white font-medium">{job.progress}%</span>
                              </div>
                              <div className="w-full bg-white/5 rounded-full h-1.5">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full transition-all duration-500"
                                  style={{ width: `${job.progress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {job.status === 'FAILED' && (
                            <button
                              type="button"
                              disabled
                              className="w-full mt-2 py-2 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded text-red-400 text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              재시도
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Quick actions */}
                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-4">빠른 작업</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <button
                      type="button"
                      className="flex flex-col items-center gap-2 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                    >
                      <Users className="w-6 h-6 text-primary" />
                      <span className="text-white text-sm font-medium">사용자 관리</span>
                    </button>
                    <button
                      type="button"
                      className="flex flex-col items-center gap-2 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                    >
                      <FileText className="w-6 h-6 text-blue-400" />
                      <span className="text-white text-sm font-medium">문서 관리</span>
                    </button>
                    <button
                      type="button"
                      className="flex flex-col items-center gap-2 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                    >
                      <PlayCircle className="w-6 h-6 text-green-400" />
                      <span className="text-white text-sm font-medium">Worker 재시작</span>
                    </button>
                    <button
                      type="button"
                      className="flex flex-col items-center gap-2 p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                    >
                      <Terminal className="w-6 h-6 text-purple-400" />
                      <span className="text-white text-sm font-medium">시스템 로그</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right panel */}
              <div className="space-y-6">
                {/* Recent events */}
                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-4">최근 이벤트</h3>
                  <div className="space-y-3">
                    {isLoading && (
                      <div className="p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center gap-3 text-gray-400 text-sm">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          최근 이벤트를 불러오는 중입니다.
                        </div>
                      </div>
                    )}
                    {!isLoading && recentEvents.length === 0 && (
                      <div className="p-3 bg-white/5 rounded-lg text-gray-400 text-sm">
                        표시할 최근 이벤트가 없습니다.
                      </div>
                    )}
                    {recentEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <div className="mt-0.5">
                          {getEventIcon(event)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-300 text-sm">{event.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-gray-500 text-xs">{formatRelativeTime(event.occurred_at)}</p>
                            <span className="text-gray-600">•</span>
                            <p className="text-gray-500 text-xs">{event.document_name ?? event.event_type}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Resource usage */}
                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-4">리소스 사용량</h3>
                  <div className="space-y-4">
                    {resourceUsage.map((item) => {
                      const Icon = item.icon;

                      return (
                        <div key={item.label}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Icon className={`w-4 h-4 ${item.textColor}`} />
                              <span className="text-gray-400 text-sm">{item.label}</span>
                            </div>
                            <span className="text-white text-sm font-medium">{item.value}%</span>
                          </div>
                          <div className="w-full bg-white/5 rounded-full h-2">
                            <div className={`${item.color} h-2 rounded-full transition-all duration-500`} style={{ width: `${item.value}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Alerts */}
                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-4">알림</h3>
                  <div className="space-y-3">
                    {alerts.length === 0 && (
                      <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-gray-400 text-sm">
                        현재 표시할 알림이 없습니다.
                      </div>
                    )}
                    {alerts.map((alert) => {
                      const Icon = alert.icon;

                      return (
                        <div key={alert.id} className={`p-3 border rounded-lg ${alert.className}`}>
                          <div className="flex items-start gap-2">
                            <Icon className={`w-4 h-4 mt-0.5 ${alert.textClassName}`} />
                            <div>
                              <p className={`${alert.textClassName} text-sm font-medium`}>{alert.title}</p>
                              <p className={`${alert.textClassName} text-xs mt-1 opacity-80`}>{alert.message}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
