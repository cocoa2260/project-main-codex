import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { getAdminAuditLogs, getAdminLogSummary, getAdminLogs, getAdminSystemHealth } from '../../api/admin';
import { Sidebar } from '../../components/common/Sidebar';
import type {
  AdminAuditAction,
  AdminAuditLogItem,
  AdminHealthService,
  AdminHealthServiceStatus,
  AdminLogItem,
  AdminLogLevel,
  AdminLogSummaryResponse,
} from '../../types/admin';
import {
  Activity,
  Menu,
  X,
  Search,
  Bell,
  RefreshCw,
  Download,
  ChevronDown,
  ChevronUp,
  Copy,
  RotateCcw,
  FileCode,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Server,
  Database,
  Cpu,
  Zap,
  Globe,
  Terminal,
  Filter,
  ExternalLink
} from 'lucide-react';

interface AdminLogPageProps {
  onLogout?: () => void;
}

interface SystemHealthItem {
  key: string;
  name: string;
  status: AdminHealthServiceStatus;
  details: string;
  checkedAt: string;
  icon: LucideIcon;
}

const AUTO_REFRESH_INTERVAL_MS = 30_000;
const PAGE_LIMIT = 50;

type LogLevelFilter = 'all' | AdminLogLevel;

type ServiceFilter = 'all' | 'OCR' | 'Queue' | 'API' | 'Security';

type AuditActionFilter = 'all' | AdminAuditAction;

interface LogFilterOption {
  label: string;
  value: LogLevelFilter | ServiceFilter;
  type: 'level' | 'service' | 'all';
}

const logFilterOptions: LogFilterOption[] = [
  { label: 'All', value: 'all', type: 'all' },
  { label: 'Info', value: 'INFO', type: 'level' },
  { label: 'Success', value: 'SUCCESS', type: 'level' },
  { label: 'Warning', value: 'WARNING', type: 'level' },
  { label: 'Error', value: 'ERROR', type: 'level' },
  { label: 'OCR', value: 'OCR', type: 'service' },
  { label: 'Queue', value: 'Queue', type: 'service' },
  { label: 'API', value: 'API', type: 'service' },
  { label: 'Security', value: 'Security', type: 'service' },
];

const auditActionOptions: Array<{ label: string; value: AuditActionFilter }> = [
  { label: 'All', value: 'all' },
  { label: 'Role 변경', value: 'USER_ROLE_CHANGED' },
  { label: 'Status 변경', value: 'USER_STATUS_CHANGED' },
];

const emptySummary: AdminLogSummaryResponse = {
  total: 0,
  info: 0,
  warning: 0,
  error: 0,
  success: 0,
  recent_errors: [],
};

const healthServiceOrder = ['api', 'postgresql', 'redis', 'ollama', 'storage', 'celery'] as const;

const healthServicePresentation: Record<typeof healthServiceOrder[number], { name: string; icon: LucideIcon }> = {
  api: { name: 'API', icon: Globe },
  postgresql: { name: 'PostgreSQL', icon: Database },
  redis: { name: 'Redis', icon: Zap },
  ollama: { name: 'Ollama', icon: Server },
  storage: { name: 'Storage', icon: FileCode },
  celery: { name: 'Celery', icon: Cpu },
};

function getApiErrorMessage(error: unknown, fallback = '요청 정보를 불러오지 못했습니다.'): string {
  const response = (error as { response?: { data?: { detail?: string; message?: string } } }).response;
  return response?.data?.detail ?? response?.data?.message ?? (error instanceof Error ? error.message : fallback);
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

function formatTime(value?: string | null): string {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

function formatDetails(details: AdminLogItem['details']): string {
  if (!details) return '';

  return Object.entries(details)
    .map(([key, value]) => `${key}: ${value ?? '-'}`)
    .join('\n');
}

function safeStringifyJson(value: unknown): string {
  if (value == null) return '-';

  if (typeof value === 'string') return value;

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function truncateText(value: string, maxLength = 420): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}

function formatAuditValue(value: unknown, maxLength?: number): string {
  return truncateText(safeStringifyJson(value), maxLength);
}

export function AdminLogPage({ onLogout }: AdminLogPageProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterLevel, setFilterLevel] = useState<LogLevelFilter>('all');
  const [filterService, setFilterService] = useState<ServiceFilter>('all');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [logs, setLogs] = useState<AdminLogItem[]>([]);
  const [summary, setSummary] = useState<AdminLogSummaryResponse>(emptySummary);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    total_pages: 0,
  });
  const [isLogsLoading, setIsLogsLoading] = useState(true);
  const [isLogsRefreshing, setIsLogsRefreshing] = useState(false);
  const [logsErrorMessage, setLogsErrorMessage] = useState<string | null>(null);
  const [logsWarningMessage, setLogsWarningMessage] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(true);
  const [isSummaryRefreshing, setIsSummaryRefreshing] = useState(false);
  const [summaryErrorMessage, setSummaryErrorMessage] = useState<string | null>(null);
  const [summaryWarningMessage, setSummaryWarningMessage] = useState<string | null>(null);
  const [healthServices, setHealthServices] = useState<AdminHealthService[]>([]);
  const [isHealthLoading, setIsHealthLoading] = useState(true);
  const [isHealthRefreshing, setIsHealthRefreshing] = useState(false);
  const [healthErrorMessage, setHealthErrorMessage] = useState<string | null>(null);
  const [auditAction, setAuditAction] = useState<AuditActionFilter>('all');
  const [auditFromDate, setAuditFromDate] = useState('');
  const [auditToDate, setAuditToDate] = useState('');
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogItem[]>([]);
  const [auditPagination, setAuditPagination] = useState({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    total_pages: 0,
  });
  const [selectedAuditLog, setSelectedAuditLog] = useState<AdminAuditLogItem | null>(null);
  const [isAuditLoading, setIsAuditLoading] = useState(true);
  const [isAuditRefreshing, setIsAuditRefreshing] = useState(false);
  const [auditErrorMessage, setAuditErrorMessage] = useState<string | null>(null);

  const fetchLogs = useCallback(async (page: number, showLoading = false) => {
    if (showLoading) {
      setIsLogsLoading(true);
    } else {
      setIsLogsRefreshing(true);
    }

    setLogsErrorMessage(null);
    setLogsWarningMessage(null);

    try {
      const response = await getAdminLogs({
        q: searchQuery.trim() || undefined,
        level: filterLevel === 'all' ? undefined : filterLevel,
        service: filterService === 'all' ? undefined : filterService,
        from: fromDate || undefined,
        to: toDate || undefined,
        page,
        limit: PAGE_LIMIT,
      });

      setLogs(response.items);
      setPagination(response.pagination);
      setLogsWarningMessage(response.warning_message ?? null);
    } catch (error) {
      setLogsErrorMessage(getApiErrorMessage(error, '로그 목록을 불러오지 못했습니다.'));
      setLogs([]);
      setPagination((current) => ({ ...current, page, total: 0, total_pages: 0 }));
    } finally {
      setIsLogsLoading(false);
      setIsLogsRefreshing(false);
    }
  }, [filterLevel, filterService, fromDate, searchQuery, toDate]);

  const fetchSummary = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsSummaryLoading(true);
    } else {
      setIsSummaryRefreshing(true);
    }

    setSummaryErrorMessage(null);
    setSummaryWarningMessage(null);

    try {
      const response = await getAdminLogSummary();
      setSummary(response);
      setSummaryWarningMessage(response.warning_message ?? null);
    } catch (error) {
      setSummaryErrorMessage(getApiErrorMessage(error, '로그 요약을 불러오지 못했습니다.'));
      setSummary(emptySummary);
    } finally {
      setIsSummaryLoading(false);
      setIsSummaryRefreshing(false);
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
      setHealthErrorMessage(getApiErrorMessage(error, '시스템 헬스 정보를 불러오지 못했습니다.'));
    } finally {
      setIsHealthLoading(false);
      setIsHealthRefreshing(false);
    }
  }, []);

  const fetchAuditLogs = useCallback(async (page: number, showLoading = false) => {
    if (showLoading) {
      setIsAuditLoading(true);
    } else {
      setIsAuditRefreshing(true);
    }

    setAuditErrorMessage(null);

    try {
      const response = await getAdminAuditLogs({
        action: auditAction === 'all' ? undefined : auditAction,
        from: auditFromDate || undefined,
        to: auditToDate || undefined,
        page,
        limit: PAGE_LIMIT,
      });

      setAuditLogs(response.items);
      setAuditPagination(response.pagination);
    } catch (error) {
      setAuditErrorMessage(getApiErrorMessage(error, '감사 로그를 불러오지 못했습니다.'));
      setAuditLogs([]);
      setAuditPagination((current) => ({ ...current, page, total: 0, total_pages: 0 }));
    } finally {
      setIsAuditLoading(false);
      setIsAuditRefreshing(false);
    }
  }, [auditAction, auditFromDate, auditToDate]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchLogs(1, true);
      void fetchSummary(true);
      void fetchSystemHealth(true);
      void fetchAuditLogs(1, true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchAuditLogs, fetchLogs, fetchSummary, fetchSystemHealth]);

  useEffect(() => {
    if (!autoRefresh) return undefined;

    const intervalId = window.setInterval(() => {
      void fetchLogs(pagination.page, false);
      void fetchSummary(false);
      void fetchSystemHealth(false);
      void fetchAuditLogs(auditPagination.page, false);
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [auditPagination.page, autoRefresh, fetchAuditLogs, fetchLogs, fetchSummary, fetchSystemHealth, pagination.page]);

  const systemHealth: SystemHealthItem[] = useMemo(() => {
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
        details: service?.details ?? (status === 'HEALTHY' ? '정상' : (healthErrorMessage ? '상태를 불러오지 못했습니다.' : '상태 확인 대기 중')),
        checkedAt: formatDateTime(service?.checked_at),
        icon: presentation.icon,
      };
    });
  }, [healthErrorMessage, healthServices]);

  const stats = useMemo(() => [
    { label: '전체 로그', value: summary.total.toLocaleString(), change: `page ${pagination.page}`, icon: Terminal, color: 'primary' },
    { label: '정보', value: summary.info.toLocaleString(), change: 'INFO', icon: Info, color: 'blue' },
    { label: '성공', value: summary.success.toLocaleString(), change: 'SUCCESS', icon: CheckCircle2, color: 'green' },
    { label: '경고', value: summary.warning.toLocaleString(), change: 'WARNING', icon: AlertTriangle, color: 'yellow' },
    { label: '오류', value: summary.error.toLocaleString(), change: 'ERROR', icon: XCircle, color: 'red' },
    { label: '최근 오류', value: summary.recent_errors.length.toLocaleString(), change: 'summary', icon: AlertCircle, color: 'purple' },
  ], [pagination.page, summary]);

  const recentErrors = summary.recent_errors;

  const realtimeActivity = logs.slice(0, 5).map((log) => ({
    id: log.id,
    time: formatTime(log.timestamp),
    message: log.message,
    type: log.level.toLowerCase() as 'success' | 'error' | 'warning' | 'info',
  }));

  const getLevelColor = (level: AdminLogLevel) => {
    switch (level) {
      case 'INFO': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'WARNING': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'ERROR': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'SUCCESS': return 'text-green-400 bg-green-500/10 border-green-500/20';
    }
  };

  const getLevelIcon = (level: AdminLogLevel) => {
    switch (level) {
      case 'INFO': return <Info className="w-4 h-4" />;
      case 'WARNING': return <AlertTriangle className="w-4 h-4" />;
      case 'ERROR': return <XCircle className="w-4 h-4" />;
      case 'SUCCESS': return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  const getLevelLabel = (level: AdminLogLevel) => {
    switch (level) {
      case 'INFO': return '정보';
      case 'SUCCESS': return '성공';
      case 'WARNING': return '경고';
      case 'ERROR': return '오류';
    }
  };

  const getAuditActionLabel = (action: AdminAuditLogItem['action']) => {
    switch (action) {
      case 'USER_ROLE_CHANGED': return 'Role 변경';
      case 'USER_STATUS_CHANGED': return 'Status 변경';
      default: return action;
    }
  };

  const getAuditActionColor = (action: AdminAuditLogItem['action']) => {
    switch (action) {
      case 'USER_ROLE_CHANGED': return 'border-blue-500/20 bg-blue-500/10 text-blue-300';
      case 'USER_STATUS_CHANGED': return 'border-purple-500/20 bg-purple-500/10 text-purple-300';
      default: return 'border-white/10 bg-white/5 text-gray-300';
    }
  };

  const getStatusColor = (status: AdminHealthServiceStatus) => {
    switch (status) {
      case 'HEALTHY': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'WARNING': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'ERROR': return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'OFFLINE': return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getActivityIcon = (type: 'success' | 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />;
      case 'error': return <XCircle className="w-3.5 h-3.5 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />;
      default: return <Info className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  const handleRefresh = () => {
    void fetchLogs(pagination.page, false);
    void fetchSummary(false);
    void fetchSystemHealth(false);
    void fetchAuditLogs(auditPagination.page, false);
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || (pagination.total_pages > 0 && nextPage > pagination.total_pages)) return;
    void fetchLogs(nextPage, true);
  };

  const handleAuditPageChange = (nextPage: number) => {
    if (nextPage < 1 || (auditPagination.total_pages > 0 && nextPage > auditPagination.total_pages)) return;
    void fetchAuditLogs(nextPage, true);
  };

  const handleFilterChange = (option: LogFilterOption) => {
    if (option.type === 'all') {
      setFilterLevel('all');
      setFilterService('all');
      return;
    }

    if (option.type === 'level') {
      setFilterLevel(option.value as LogLevelFilter);
      setFilterService('all');
      return;
    }

    setFilterLevel('all');
    setFilterService(option.value as ServiceFilter);
  };

  const isFilterActive = (option: LogFilterOption) => {
    if (option.type === 'all') return filterLevel === 'all' && filterService === 'all';
    if (option.type === 'level') return filterLevel === option.value;
    return filterService === option.value;
  };

  const handleCopyLog = (log: AdminLogItem) => {
    const logText = `[${log.timestamp}] [${log.level}] [${log.service ?? '-'}/${log.source}] ${log.message}`;
    navigator.clipboard.writeText(logText);
  };

  const handleCopyAuditLog = (log: AdminAuditLogItem) => {
    const logText = [
      `[${log.created_at}] [${log.action}]`,
      `actor=${log.actor_email_snapshot ?? '-'}`,
      `target=${log.target_type}:${log.target_id ?? '-'}`,
      `old=${safeStringifyJson(log.old_value)}`,
      `new=${safeStringifyJson(log.new_value)}`,
    ].join(' ');
    navigator.clipboard.writeText(logText);
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
                placeholder="로그 검색..."
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
              <span className="text-sm hidden sm:inline">자동 새로고침</span>
            </button>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLogsLoading || isSummaryLoading || isHealthLoading || isAuditLoading}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-gray-400 ${isLogsRefreshing || isSummaryRefreshing || isHealthRefreshing || isAuditRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-gray-400 text-sm hidden sm:inline">Refresh</span>
            </button>

            <button
              type="button"
              disabled
              title="로그 Export API 준비중"
              className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400 text-sm hidden sm:inline">Export</span>
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
                <h2 className="text-2xl font-bold text-white mb-1">시스템 로그</h2>
                <p className="text-gray-400">실시간 로그 모니터링 및 분석</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-green-400 text-sm font-medium">Live</span>
                </div>
              </div>
            </div>

            {(isSummaryLoading || summaryErrorMessage || summaryWarningMessage) && (
              <div className={`rounded-xl border p-4 ${
                summaryErrorMessage
                  ? 'border-red-500/20 bg-red-500/10'
                  : summaryWarningMessage
                    ? 'border-yellow-500/20 bg-yellow-500/10'
                    : 'border-white/10 bg-[#111116]'
              }`}>
                <div className="flex items-center gap-2">
                  {isSummaryLoading ? (
                    <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                  ) : (
                    <AlertCircle className={`h-4 w-4 ${summaryErrorMessage ? 'text-red-400' : 'text-yellow-400'}`} />
                  )}
                  <p className={`text-sm ${
                    summaryErrorMessage ? 'text-red-400' : summaryWarningMessage ? 'text-yellow-400' : 'text-gray-400'
                  }`}>
                    {isSummaryLoading ? '로그 요약을 불러오는 중입니다.' : summaryErrorMessage ?? summaryWarningMessage}
                  </p>
                </div>
              </div>
            )}

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
                            stat.color === 'blue' ? 'text-blue-400' :
                            stat.color === 'yellow' ? 'text-yellow-400' :
                            'text-purple-400'
                          }`} />
                        </div>
                        <span className={`text-xs font-medium ${
                          stat.color === 'red' ? 'text-red-400' : 'text-green-400'
                        }`}>{stat.change}</span>
                      </div>
                      <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              {/* Log table */}
              <div className="xl:col-span-3 space-y-4">
                {/* Filters */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  {logFilterOptions.map((option, index) => (
                    <div key={`${option.type}-${option.value}`} className="flex items-center gap-2">
                      {index === 5 && <div className="w-px h-4 bg-white/10 flex-shrink-0" />}
                      <button
                        type="button"
                        onClick={() => handleFilterChange(option)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                          isFilterActive(option)
                            ? 'bg-primary text-white'
                            : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {option.label}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#111116] p-3">
                  <span className="text-xs font-medium text-gray-400">기간</span>
                  <input
                    type="datetime-local"
                    value={fromDate}
                    onChange={(event) => setFromDate(event.target.value)}
                    className="min-w-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300 [color-scheme:dark] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary/50"
                    aria-label="로그 시작 일시"
                  />
                  <span className="text-xs text-gray-500">~</span>
                  <input
                    type="datetime-local"
                    value={toDate}
                    onChange={(event) => setToDate(event.target.value)}
                    className="min-w-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300 [color-scheme:dark] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary/50"
                    aria-label="로그 종료 일시"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setFromDate('');
                      setToDate('');
                    }}
                    disabled={!fromDate && !toDate}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    초기화
                  </button>
                </div>

                {/* Logs - Terminal style */}
                <div className="bg-[#111116] border border-white/10 rounded-xl overflow-hidden">
                  <div className="bg-white/5 border-b border-white/10 px-4 py-2 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-primary" />
                    <span className="text-white text-sm font-medium">System Logs</span>
                    <span className="text-gray-500 text-xs ml-auto">
                      page {pagination.page} / {Math.max(1, pagination.total_pages)} · limit {pagination.limit} · total {pagination.total.toLocaleString()}
                    </span>
                  </div>

                  {(logsErrorMessage || logsWarningMessage) && (
                    <div className={`m-4 rounded-lg border p-3 ${
                      logsErrorMessage ? 'border-red-500/20 bg-red-500/10' : 'border-yellow-500/20 bg-yellow-500/10'
                    }`}>
                      <div className="flex items-start gap-2">
                        <AlertCircle className={`mt-0.5 h-4 w-4 ${logsErrorMessage ? 'text-red-400' : 'text-yellow-400'}`} />
                        <p className={`text-sm ${logsErrorMessage ? 'text-red-400' : 'text-yellow-400'}`}>
                          {logsErrorMessage ?? logsWarningMessage}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                    {isLogsLoading && (
                      <div className="flex items-center justify-center gap-2 p-8 text-gray-400">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span className="text-sm">로그를 불러오는 중입니다.</span>
                      </div>
                    )}

                    {!isLogsLoading && logs.length === 0 && !logsErrorMessage && (
                      <div className="p-8 text-center">
                        <Terminal className="mx-auto mb-3 h-8 w-8 text-gray-600" />
                        <p className="text-sm text-gray-400">조회된 로그가 없습니다.</p>
                      </div>
                    )}

                    {!isLogsLoading && logs.map((log) => (
                      <div key={log.id} className="hover:bg-white/5 transition-colors">
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              <div className={`p-1.5 rounded-lg border ${getLevelColor(log.level)}`}>
                                {getLevelIcon(log.level)}
                              </div>
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <code className="text-gray-400 text-xs font-mono">{formatDateTime(log.timestamp)}</code>
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getLevelColor(log.level)}`}>
                                    {getLevelLabel(log.level)}
                                  </span>
                                  <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-xs font-medium">
                                    {log.service ?? '-'}
                                  </span>
                                  <span className="text-gray-500 text-xs font-mono">/{log.source}</span>
                                </div>
                              </div>

                              <p className="text-white text-sm mb-3">{log.message}</p>

                              {expandedLog === log.id && log.details && (
                                <div className="mb-3 p-3 bg-black/30 border border-white/5 rounded-lg">
                                  <pre className="text-gray-400 text-xs font-mono whitespace-pre-wrap">{formatDetails(log.details)}</pre>
                                </div>
                              )}

                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="rounded bg-white/5 px-2 py-1 text-xs text-gray-500">
                                  Task: {log.related_task_id ?? '-'}
                                </span>
                                <span className="rounded bg-white/5 px-2 py-1 text-xs text-gray-500">
                                  Document: {log.related_document_id ?? '-'}
                                </span>
                                {log.details && (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                                    className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-gray-400 hover:text-white text-xs transition-colors"
                                  >
                                    {expandedLog === log.id ? (
                                      <>
                                        <ChevronUp className="w-3 h-3" />
                                        <span>숨기기</span>
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="w-3 h-3" />
                                        <span>상세보기</span>
                                      </>
                                    )}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleCopyLog(log)}
                                  className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-gray-400 hover:text-white text-xs transition-colors"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>복사</span>
                                </button>
                                {log.related_task_id && (
                                  <button
                                    type="button"
                                    disabled
                                    title="로그 재시도 API 준비중"
                                    className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded text-gray-500 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>재시도</span>
                                  </button>
                                )}
                                {log.related_document_id && (
                                  <button
                                    type="button"
                                    disabled
                                    title="문서 상세 이동 준비중"
                                    className="flex items-center gap-1.5 px-2 py-1 bg-white/5 rounded text-gray-500 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>문서 보기</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#111116] px-4 py-3">
                  <p className="text-sm text-gray-400">
                    {pagination.total.toLocaleString()}개 중 {logs.length.toLocaleString()}개 표시
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1 || isLogsLoading}
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
                      disabled={pagination.page >= pagination.total_pages || isLogsLoading || pagination.total_pages === 0}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      다음
                    </button>
                  </div>
                </div>

                {/* Audit logs */}
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">감사 로그</h3>
                      <p className="text-sm text-gray-400">관리자 권한 변경과 계정 상태 변경 이력</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => fetchAuditLogs(auditPagination.page, false)}
                      disabled={isAuditLoading || isAuditRefreshing}
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-gray-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshCw className={`h-4 w-4 ${isAuditRefreshing ? 'animate-spin' : ''}`} />
                      <span>감사 로그 새로고침</span>
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[#111116] p-3">
                    <Filter className="h-4 w-4 flex-shrink-0 text-gray-400" />
                    {auditActionOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setAuditAction(option.value)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                          auditAction === option.value
                            ? 'bg-primary text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                    <div className="mx-1 hidden h-4 w-px bg-white/10 sm:block" />
                    <span className="text-xs font-medium text-gray-400">기간</span>
                    <input
                      type="datetime-local"
                      value={auditFromDate}
                      onChange={(event) => setAuditFromDate(event.target.value)}
                      className="min-w-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300 [color-scheme:dark] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary/50"
                      aria-label="감사 로그 시작 일시"
                    />
                    <span className="text-xs text-gray-500">~</span>
                    <input
                      type="datetime-local"
                      value={auditToDate}
                      onChange={(event) => setAuditToDate(event.target.value)}
                      className="min-w-0 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300 [color-scheme:dark] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary/50"
                      aria-label="감사 로그 종료 일시"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setAuditAction('all');
                        setAuditFromDate('');
                        setAuditToDate('');
                      }}
                      disabled={auditAction === 'all' && !auditFromDate && !auditToDate}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      초기화
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-white/10 bg-[#111116]">
                    <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-2">
                      <FileCode className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-white">Audit Logs</span>
                      <span className="ml-auto text-xs text-gray-500">
                        page {auditPagination.page} / {Math.max(1, auditPagination.total_pages)} · limit {auditPagination.limit} · total {auditPagination.total.toLocaleString()}
                      </span>
                    </div>

                    {auditErrorMessage && (
                      <div className="m-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="mt-0.5 h-4 w-4 text-red-400" />
                          <p className="text-sm text-red-400">{auditErrorMessage}</p>
                        </div>
                      </div>
                    )}

                    <div className="divide-y divide-white/5">
                      {isAuditLoading && (
                        <div className="flex items-center justify-center gap-2 p-8 text-gray-400">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span className="text-sm">감사 로그를 불러오는 중입니다.</span>
                        </div>
                      )}

                      {!isAuditLoading && auditLogs.length === 0 && !auditErrorMessage && (
                        <div className="p-8 text-center">
                          <FileCode className="mx-auto mb-3 h-8 w-8 text-gray-600" />
                          <p className="text-sm text-gray-400">조회된 감사 로그가 없습니다.</p>
                        </div>
                      )}

                      {!isAuditLoading && auditLogs.map((log) => (
                        <button
                          key={log.id}
                          type="button"
                          onClick={() => setSelectedAuditLog(selectedAuditLog?.id === log.id ? null : log)}
                          className={`block w-full p-4 text-left transition-colors hover:bg-white/5 ${
                            selectedAuditLog?.id === log.id ? 'bg-primary/5' : ''
                          }`}
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="mb-2 flex flex-wrap items-center gap-2">
                                <code className="text-xs font-mono text-gray-400">{formatDateTime(log.created_at)}</code>
                                <span className={`rounded border px-2 py-0.5 text-xs font-medium ${getAuditActionColor(log.action)}`}>
                                  {getAuditActionLabel(log.action)}
                                </span>
                                <span className="rounded border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-gray-300">
                                  {log.target_type}
                                </span>
                              </div>
                              <p className="truncate text-sm text-white">{log.actor_email_snapshot ?? 'Unknown admin'}</p>
                              <p className="mt-1 truncate font-mono text-xs text-gray-500">Target: {log.target_id ?? '-'}</p>
                            </div>
                            <div className="grid gap-2 text-xs text-gray-400 sm:grid-cols-2 lg:w-[360px]">
                              <div className="rounded-lg bg-black/20 p-2">
                                <p className="mb-1 text-gray-500">Old</p>
                                <pre className="max-h-20 overflow-hidden whitespace-pre-wrap break-words font-mono">{formatAuditValue(log.old_value, 180)}</pre>
                              </div>
                              <div className="rounded-lg bg-black/20 p-2">
                                <p className="mb-1 text-gray-500">New</p>
                                <pre className="max-h-20 overflow-hidden whitespace-pre-wrap break-words font-mono">{formatAuditValue(log.new_value, 180)}</pre>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedAuditLog && (
                    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">감사 로그 상세</p>
                          <p className="text-xs text-gray-400">{formatDateTime(selectedAuditLog.created_at)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyAuditLog(selectedAuditLog)}
                            className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1 text-xs text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
                          >
                            <Copy className="h-3 w-3" />
                            <span>복사</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedAuditLog(null)}
                            className="rounded-lg bg-white/5 p-1.5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                          <p className="mb-1 text-xs text-gray-500">관리자</p>
                          <p className="break-words text-sm text-white">{selectedAuditLog.actor_email_snapshot ?? '-'}</p>
                          <p className="mt-1 break-all font-mono text-xs text-gray-500">{selectedAuditLog.actor_user_id ?? '-'}</p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                          <p className="mb-1 text-xs text-gray-500">Action / Target</p>
                          <p className="text-sm text-white">{getAuditActionLabel(selectedAuditLog.action)}</p>
                          <p className="mt-1 break-all font-mono text-xs text-gray-500">
                            {selectedAuditLog.target_type}:{selectedAuditLog.target_id ?? '-'}
                          </p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                          <p className="mb-1 text-xs text-gray-500">Old Value</p>
                          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-gray-300">{formatAuditValue(selectedAuditLog.old_value)}</pre>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                          <p className="mb-1 text-xs text-gray-500">New Value</p>
                          <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-gray-300">{formatAuditValue(selectedAuditLog.new_value)}</pre>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                          <p className="mb-1 text-xs text-gray-500">Reason</p>
                          <p className="whitespace-pre-wrap break-words text-sm text-gray-300">{selectedAuditLog.reason ?? '-'}</p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                          <p className="mb-1 text-xs text-gray-500">IP / User Agent</p>
                          <p className="font-mono text-xs text-gray-300">{selectedAuditLog.ip_address ?? '-'}</p>
                          <p className="mt-1 break-words text-xs text-gray-500">{selectedAuditLog.user_agent ?? '-'}</p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-black/20 p-3 md:col-span-2">
                          <p className="mb-1 text-xs text-gray-500">Metadata</p>
                          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words font-mono text-xs text-gray-300">{formatAuditValue(selectedAuditLog.metadata)}</pre>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-[#111116] px-4 py-3">
                    <p className="text-sm text-gray-400">
                      {auditPagination.total.toLocaleString()}개 중 {auditLogs.length.toLocaleString()}개 표시
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAuditPageChange(auditPagination.page - 1)}
                        disabled={auditPagination.page <= 1 || isAuditLoading}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        이전
                      </button>
                      <span className="min-w-24 text-center text-sm text-gray-400">
                        {auditPagination.page} / {Math.max(1, auditPagination.total_pages)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAuditPageChange(auditPagination.page + 1)}
                        disabled={auditPagination.page >= auditPagination.total_pages || isAuditLoading || auditPagination.total_pages === 0}
                        className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        다음
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right panel */}
              <div className="space-y-6">
                {/* System Health */}
                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h3 className="text-white font-semibold text-lg flex items-center gap-2">
                      <Activity className="w-5 h-5 text-primary" />
                      System Health
                    </h3>
                    <button
                      type="button"
                      onClick={() => fetchSystemHealth(false)}
                      disabled={isHealthLoading || isHealthRefreshing}
                      className="p-2 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                    >
                      <RefreshCw className={`w-4 h-4 text-gray-400 ${isHealthRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {healthErrorMessage && (
                    <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                        <div>
                          <p className="text-red-400 text-sm font-medium">시스템 헬스 정보를 불러오지 못했습니다.</p>
                          <p className="text-red-400/80 text-xs mt-1">{healthErrorMessage}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {systemHealth.map((service) => (
                      <div key={service.key} className={`p-3 border rounded-lg ${getStatusColor(service.status)}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <service.icon className="w-4 h-4" />
                            <span className="font-medium text-sm">{service.name}</span>
                          </div>
                          {isHealthLoading ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <div className={`w-2 h-2 rounded-full ${
                              service.status === 'HEALTHY' ? 'bg-green-400 animate-pulse' :
                              service.status === 'WARNING' ? 'bg-yellow-400' :
                              service.status === 'ERROR' ? 'bg-red-400' :
                              'bg-gray-400'
                            }`} />
                          )}
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="opacity-80">Status</span>
                          <span className="font-medium">{service.status}</span>
                        </div>
                        <p className="text-xs opacity-80 mt-2">{service.details}</p>
                        <p className="text-xs opacity-60 mt-1">Checked: {service.checkedAt}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Errors */}
                <div className="bg-[#111116] border border-red-500/20 rounded-xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <h3 className="text-white font-semibold text-lg">Recent Errors</h3>
                  </div>

                  {summaryErrorMessage && (
                    <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-red-400 text-sm">{summaryErrorMessage}</p>
                    </div>
                  )}

                  {summaryWarningMessage && !summaryErrorMessage && (
                    <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <p className="text-yellow-400 text-sm">{summaryWarningMessage}</p>
                    </div>
                  )}

                  <div className="space-y-3">
                    {isSummaryLoading && (
                      <div className="flex items-center gap-2 p-3 text-gray-400">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span className="text-sm">최근 오류를 불러오는 중입니다.</span>
                      </div>
                    )}

                    {!isSummaryLoading && recentErrors.length === 0 && !summaryErrorMessage && (
                      <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                        <p className="text-gray-400 text-sm">최근 오류 로그가 없습니다.</p>
                      </div>
                    )}

                    {!isSummaryLoading && recentErrors.map((error) => (
                      <div key={error.id} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <code className="text-gray-400 text-xs font-mono">{formatTime(error.timestamp)}</code>
                          <span className="text-red-400 text-xs">{error.service ?? '-'}</span>
                        </div>
                        <p className="text-red-400/90 text-sm line-clamp-2">{error.message}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Realtime Activity */}
                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    실시간 활동
                  </h3>
                  <div className="space-y-3">
                    {isLogsLoading && (
                      <div className="flex items-center gap-2 p-3 text-gray-400">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span className="text-sm">활동을 불러오는 중입니다.</span>
                      </div>
                    )}

                    {!isLogsLoading && realtimeActivity.length === 0 && (
                      <div className="p-3 bg-white/5 rounded-lg">
                        <p className="text-gray-400 text-sm">표시할 활동이 없습니다.</p>
                      </div>
                    )}

                    {!isLogsLoading && realtimeActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
                        <div className="mt-0.5">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-300 text-sm">{activity.message}</p>
                          <p className="text-gray-500 text-xs mt-1">{activity.time}</p>
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
