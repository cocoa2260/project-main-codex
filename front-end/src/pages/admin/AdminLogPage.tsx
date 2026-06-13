import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { getAdminSystemHealth } from '../../api/admin';
import { Sidebar } from '../../components/common/Sidebar';
import type { AdminHealthService, AdminHealthServiceStatus } from '../../types/admin';
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
  Eye,
  RotateCcw,
  FileCode,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  User,
  Server,
  Database,
  Cpu,
  Zap,
  Globe,
  Terminal,
  Filter,
  ExternalLink
} from 'lucide-react';

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  service: string;
  source: string;
  message: string;
  user?: string;
  details?: string;
  relatedJob?: string;
  relatedDocument?: string;
}

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

const healthServiceOrder = ['api', 'postgresql', 'redis', 'ollama', 'storage', 'celery'] as const;

const healthServicePresentation: Record<typeof healthServiceOrder[number], { name: string; icon: LucideIcon }> = {
  api: { name: 'API', icon: Globe },
  postgresql: { name: 'PostgreSQL', icon: Database },
  redis: { name: 'Redis', icon: Zap },
  ollama: { name: 'Ollama', icon: Server },
  storage: { name: 'Storage', icon: FileCode },
  celery: { name: 'Celery', icon: Cpu },
};

function getApiErrorMessage(error: unknown): string {
  const response = (error as { response?: { data?: { detail?: string; message?: string } } }).response;
  return response?.data?.detail ?? response?.data?.message ?? (error instanceof Error ? error.message : '시스템 헬스 정보를 불러오지 못했습니다.');
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

export function AdminLogPage({ onLogout }: AdminLogPageProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterLevel, setFilterLevel] = useState<'all' | 'info' | 'warning' | 'error' | 'ocr' | 'queue' | 'api' | 'security'>('all');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [healthServices, setHealthServices] = useState<AdminHealthService[]>([]);
  const [isHealthLoading, setIsHealthLoading] = useState(true);
  const [isHealthRefreshing, setIsHealthRefreshing] = useState(false);
  const [healthErrorMessage, setHealthErrorMessage] = useState<string | null>(null);

  const stats = [
    { label: '전체 로그', value: '12,456', change: '+342', icon: Terminal, color: 'primary' },
    { label: 'Errors', value: '23', change: '+5', icon: XCircle, color: 'red' },
    { label: 'Warnings', value: '156', change: '+18', icon: AlertTriangle, color: 'yellow' },
    { label: 'OCR Events', value: '3,421', change: '+89', icon: Eye, color: 'blue' },
    { label: 'Queue Events', value: '5,234', change: '+156', icon: Zap, color: 'purple' },
    { label: 'API Events', value: '3,622', change: '+94', icon: Globe, color: 'green' }
  ];

  const logs: LogEntry[] = [
    {
      id: 'log-001',
      timestamp: '2026-06-03 14:42:15',
      level: 'info',
      service: 'OCR',
      source: 'worker-1',
      message: 'OCR processing started for document: 계약서_검토본.pdf',
      user: '김철수',
      details: 'Document ID: doc-12345\nPages: 15\nEngine: Tesseract\nDPI: 300',
      relatedJob: 'job-001',
      relatedDocument: 'doc-12345'
    },
    {
      id: 'log-002',
      timestamp: '2026-06-03 14:41:48',
      level: 'warning',
      service: 'Worker',
      source: 'celery-monitor',
      message: 'Worker overload detected - OCR queue backlog: 45 items',
      details: 'Queue: ocr-queue\nWaiting jobs: 45\nActive workers: 2\nRecommendation: Scale up workers'
    },
    {
      id: 'log-003',
      timestamp: '2026-06-03 14:40:32',
      level: 'error',
      service: 'OCR',
      source: 'worker-2',
      message: 'OCR processing timeout after 180s',
      user: '정수진',
      details: 'Document: 기술문서_API.pdf\nError: TimeoutError\nStack trace: ...',
      relatedJob: 'job-004',
      relatedDocument: 'doc-67890'
    },
    {
      id: 'log-004',
      timestamp: '2026-06-03 14:39:15',
      level: 'success',
      service: 'Embedding',
      source: 'worker-3',
      message: 'Document embedding completed successfully',
      user: '최민지',
      details: 'Document: 회의록_0515.pdf\nChunks: 156\nModel: all-MiniLM-L6-v2\nDuration: 8.2s',
      relatedJob: 'job-005',
      relatedDocument: 'doc-54321'
    },
    {
      id: 'log-005',
      timestamp: '2026-06-03 14:38:22',
      level: 'info',
      service: 'API',
      source: 'api-server',
      message: 'Document uploaded via API endpoint',
      user: '이영희',
      details: 'Endpoint: POST /api/documents/upload\nFile size: 2.4 MB\nIP: 192.168.1.45'
    },
    {
      id: 'log-006',
      timestamp: '2026-06-03 14:37:10',
      level: 'warning',
      service: 'Queue',
      source: 'redis',
      message: 'Queue memory usage approaching threshold (85%)',
      details: 'Current: 850 MB / 1000 MB\nOldest job: 15 minutes\nRecommendation: Clear completed jobs'
    },
    {
      id: 'log-007',
      timestamp: '2026-06-03 14:35:45',
      level: 'error',
      service: 'Security',
      source: 'auth-middleware',
      message: 'Failed login attempt detected',
      details: 'Username: unknown_user\nIP: 203.142.65.23\nAttempts: 5\nAction: IP temporarily blocked'
    },
    {
      id: 'log-008',
      timestamp: '2026-06-03 14:34:12',
      level: 'info',
      service: 'LLM',
      source: 'ollama',
      message: 'AI summary generation completed',
      user: '박민수',
      details: 'Model: gemma:7b\nTokens: 1,234\nTemperature: 0.7\nDuration: 5.3s',
      relatedJob: 'job-002'
    }
  ];

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
      void fetchSystemHealth(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchSystemHealth]);

  useEffect(() => {
    if (!autoRefresh) return undefined;

    const intervalId = window.setInterval(() => {
      void fetchSystemHealth(false);
    }, AUTO_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [autoRefresh, fetchSystemHealth]);

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

      return {
        key,
        name: presentation.name,
        status: service?.status ?? 'OFFLINE',
        details: service?.details ?? (healthErrorMessage ? '상태를 불러오지 못했습니다.' : '상태 확인 대기 중'),
        checkedAt: formatDateTime(service?.checked_at),
        icon: presentation.icon,
      };
    });
  }, [healthErrorMessage, healthServices]);

  const recentErrors = [
    { time: '14:40:32', message: 'OCR timeout after 180s', service: 'OCR' },
    { time: '14:35:45', message: 'Failed login attempt', service: 'Security' },
    { time: '14:28:15', message: 'Worker connection lost', service: 'Worker' },
    { time: '14:15:20', message: 'Database query timeout', service: 'Database' }
  ];

  const realtimeActivity = [
    { time: '14:42', message: 'OCR processing started', type: 'info' as const },
    { time: '14:41', message: 'Worker overload detected', type: 'warning' as const },
    { time: '14:40', message: 'OCR timeout occurred', type: 'error' as const },
    { time: '14:39', message: 'Embedding completed', type: 'success' as const },
    { time: '14:38', message: 'Document uploaded', type: 'info' as const }
  ];

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.source.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterLevel === 'all' ? true :
      filterLevel === 'info' ? log.level === 'info' :
      filterLevel === 'warning' ? log.level === 'warning' :
      filterLevel === 'error' ? log.level === 'error' :
      filterLevel === 'ocr' ? log.service.toLowerCase() === 'ocr' :
      filterLevel === 'queue' ? log.service.toLowerCase() === 'queue' :
      filterLevel === 'api' ? log.service.toLowerCase() === 'api' :
      filterLevel === 'security' ? log.service.toLowerCase() === 'security' : true;

    return matchesSearch && matchesFilter;
  });

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'info': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'warning': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'error': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'success': return 'text-green-400 bg-green-500/10 border-green-500/20';
    }
  };

  const getLevelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'info': return <Info className="w-4 h-4" />;
      case 'warning': return <AlertTriangle className="w-4 h-4" />;
      case 'error': return <XCircle className="w-4 h-4" />;
      case 'success': return <CheckCircle2 className="w-4 h-4" />;
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

  const handleCopyLog = (log: LogEntry) => {
    const logText = `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.service}/${log.source}] ${log.message}`;
    navigator.clipboard.writeText(logText);
  };

  const handleExportLogs = () => {
    console.log('Exporting logs...');
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
              onClick={handleExportLogs}
              className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
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
                  <button
                    type="button"
                    onClick={() => setFilterLevel('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                      filterLevel === 'all'
                        ? 'bg-primary text-white'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterLevel('info')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                      filterLevel === 'info'
                        ? 'bg-primary text-white'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Info
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterLevel('warning')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                      filterLevel === 'warning'
                        ? 'bg-primary text-white'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Warning
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterLevel('error')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                      filterLevel === 'error'
                        ? 'bg-primary text-white'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Error
                  </button>
                  <div className="w-px h-4 bg-white/10 flex-shrink-0" />
                  <button
                    type="button"
                    onClick={() => setFilterLevel('ocr')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                      filterLevel === 'ocr'
                        ? 'bg-primary text-white'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    OCR
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterLevel('queue')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                      filterLevel === 'queue'
                        ? 'bg-primary text-white'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Queue
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterLevel('api')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                      filterLevel === 'api'
                        ? 'bg-primary text-white'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    API
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterLevel('security')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                      filterLevel === 'security'
                        ? 'bg-primary text-white'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Security
                  </button>
                </div>

                {/* Logs - Terminal style */}
                <div className="bg-[#111116] border border-white/10 rounded-xl overflow-hidden">
                  <div className="bg-white/5 border-b border-white/10 px-4 py-2 flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-primary" />
                    <span className="text-white text-sm font-medium">System Logs</span>
                    <span className="text-gray-500 text-xs ml-auto">{filteredLogs.length} entries</span>
                  </div>

                  <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                    {filteredLogs.map((log) => (
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
                                  <code className="text-gray-400 text-xs font-mono">{log.timestamp}</code>
                                  <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getLevelColor(log.level)}`}>
                                    {log.level.toUpperCase()}
                                  </span>
                                  <span className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-xs font-medium">
                                    {log.service}
                                  </span>
                                  <span className="text-gray-500 text-xs font-mono">/{log.source}</span>
                                </div>
                                {log.user && (
                                  <div className="flex items-center gap-1.5 text-gray-400 text-xs flex-shrink-0">
                                    <User className="w-3 h-3" />
                                    <span>{log.user}</span>
                                  </div>
                                )}
                              </div>

                              <p className="text-white text-sm mb-3">{log.message}</p>

                              {expandedLog === log.id && log.details && (
                                <div className="mb-3 p-3 bg-black/30 border border-white/5 rounded-lg">
                                  <pre className="text-gray-400 text-xs font-mono whitespace-pre-wrap">{log.details}</pre>
                                </div>
                              )}

                              <div className="flex items-center gap-2 flex-wrap">
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
                                {log.relatedJob && (
                                  <button
                                    type="button"
                                    className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-gray-400 hover:text-white text-xs transition-colors"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>재시도</span>
                                  </button>
                                )}
                                {log.relatedDocument && (
                                  <button
                                    type="button"
                                    className="flex items-center gap-1.5 px-2 py-1 bg-white/5 hover:bg-white/10 rounded text-gray-400 hover:text-white text-xs transition-colors"
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
                  <div className="space-y-3">
                    {recentErrors.map((error, idx) => (
                      <div key={idx} className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <code className="text-gray-400 text-xs font-mono">{error.time}</code>
                          <span className="text-red-400 text-xs">{error.service}</span>
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
                    {realtimeActivity.map((activity, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-white/5 rounded-lg">
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
