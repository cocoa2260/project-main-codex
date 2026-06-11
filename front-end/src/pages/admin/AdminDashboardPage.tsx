import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Users,
  Activity,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Loader2,
  Database,
  Zap,
  TrendingUp,
  TrendingDown,
  BarChart3,
  RefreshCw,
  PlayCircle,
  FileWarning,
  AlertTriangle,
  Terminal,
  Cpu,
  HardDrive,
  Layers,
  Calendar
} from 'lucide-react';

interface SystemService {
  name: string;
  status: 'healthy' | 'warning' | 'error' | 'offline';
  icon: any;
  details?: string;
  uptime?: string;
}

interface Job {
  id: string;
  documentName: string;
  type: 'ocr' | 'summary' | 'embedding';
  progress: number;
  user: string;
  status: 'running' | 'queued' | 'failed';
  startedAt: string;
}

interface AdminDashboardPageProps {
  onLogout?: () => void;
}

export function AdminDashboardPage({ onLogout }: AdminDashboardPageProps) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: Home },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'jobs', label: 'Jobs', icon: Activity },
    { id: 'system', label: 'System', icon: Cpu },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];



  const adminMenuRoutes: Record<string, string> = {
    dashboard: '/admin',
    users: '/admin/users',
    documents: '/admin/documents',
    jobs: '/admin/jobs',
    system: '/admin/logs',
    settings: '/admin/settings',
  };

  const handleMenuClick = (menuId: string) => {
    const route = adminMenuRoutes[menuId];
    if (route) navigate(route);
  };
  const stats = [
    {
      label: '전체 사용자',
      value: '1,234',
      change: '+5.2%',
      trend: 'up' as const,
      icon: Users,
      color: 'primary'
    },
    {
      label: '전체 문서',
      value: '8,456',
      change: '+12.8%',
      trend: 'up' as const,
      icon: FileText,
      color: 'blue'
    },
    {
      label: '처리 중 작업',
      value: '23',
      change: '-3',
      trend: 'down' as const,
      icon: Loader2,
      color: 'purple'
    },
    {
      label: '실패한 작업',
      value: '5',
      change: '+2',
      trend: 'up' as const,
      icon: XCircle,
      color: 'red'
    },
    {
      label: '대기 큐',
      value: '12',
      change: '+4',
      trend: 'up' as const,
      icon: Clock,
      color: 'yellow'
    },
    {
      label: '오늘 처리량',
      value: '342',
      change: '+18%',
      trend: 'up' as const,
      icon: TrendingUp,
      color: 'green'
    }
  ];

  const systemServices: SystemService[] = [
    {
      name: 'OCR Workers',
      status: 'healthy',
      icon: FileText,
      details: '3 / 5 active',
      uptime: '99.9%'
    },
    {
      name: 'Celery Workers',
      status: 'healthy',
      icon: Zap,
      details: '4 / 5 active',
      uptime: '99.8%'
    },
    {
      name: 'Redis',
      status: 'healthy',
      icon: Database,
      details: 'Connected',
      uptime: '100%'
    },
    {
      name: 'Ollama',
      status: 'warning',
      icon: Activity,
      details: 'High load',
      uptime: '98.5%'
    },
    {
      name: 'PostgreSQL',
      status: 'healthy',
      icon: Database,
      details: 'Connected',
      uptime: '100%'
    },
    {
      name: 'Queue System',
      status: 'healthy',
      icon: Layers,
      details: '12 queued',
      uptime: '99.9%'
    }
  ];

  const activeJobs: Job[] = [
    {
      id: '1',
      documentName: '계약서_검토본.pdf',
      type: 'ocr',
      progress: 65,
      user: '김철수',
      status: 'running',
      startedAt: '2분 전'
    },
    {
      id: '2',
      documentName: '프로젝트_제안서.pdf',
      type: 'summary',
      progress: 45,
      user: '이영희',
      status: 'running',
      startedAt: '5분 전'
    },
    {
      id: '3',
      documentName: '보고서_Q1.pdf',
      type: 'embedding',
      progress: 0,
      user: '박민수',
      status: 'queued',
      startedAt: '방금'
    },
    {
      id: '4',
      documentName: '기술문서_API.pdf',
      type: 'ocr',
      progress: 0,
      user: '정수진',
      status: 'failed',
      startedAt: '10분 전'
    }
  ];

  const recentEvents = [
    {
      id: '1',
      type: 'success' as const,
      message: '회의록_0515.pdf 처리 완료',
      time: '1분 전',
      user: '홍길동'
    },
    {
      id: '2',
      type: 'error' as const,
      message: '기술문서_API.pdf OCR 실패',
      time: '5분 전',
      user: '정수진'
    },
    {
      id: '3',
      type: 'warning' as const,
      message: 'Ollama worker 높은 부하',
      time: '10분 전',
      user: 'System'
    },
    {
      id: '4',
      type: 'info' as const,
      message: '새 사용자 등록',
      time: '15분 전',
      user: '최민지'
    }
  ];

  const getStatusColor = (status: SystemService['status']) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500/10 border-green-500/20 text-green-400';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
      case 'error':
        return 'bg-red-500/10 border-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/10 border-gray-500/20 text-gray-400';
    }
  };

  const getJobTypeLabel = (type: Job['type']) => {
    switch (type) {
      case 'ocr':
        return 'OCR 처리';
      case 'summary':
        return 'AI 요약';
      case 'embedding':
        return '임베딩';
    }
  };

  const getJobTypeColor = (type: Job['type']) => {
    switch (type) {
      case 'ocr':
        return 'bg-blue-500/10 text-blue-400';
      case 'summary':
        return 'bg-purple-500/10 text-purple-400';
      case 'embedding':
        return 'bg-yellow-500/10 text-yellow-400';
    }
  };

  const getEventIcon = (type: 'success' | 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-400" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'warning':
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

            {/* System status badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-green-400 text-sm font-medium">All Systems Operational</span>
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
              className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white text-sm"
            >
              로그아웃
            </button>
          </div>
        </header>

        {/* Dashboard content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-[1800px] mx-auto space-y-6">
            {/* Header */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-1">관리자 대시보드</h2>
              <p className="text-gray-400">AI 문서 자동화 플랫폼 통합 관리</p>
            </div>

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
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
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
                      className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>

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
                            <div className={`w-2 h-2 rounded-full ${
                              service.status === 'healthy' ? 'bg-green-400 animate-pulse' :
                              service.status === 'warning' ? 'bg-yellow-400 animate-pulse' :
                              service.status === 'error' ? 'bg-red-400 animate-pulse' :
                              'bg-gray-400'
                            }`} />
                          </div>
                          <h4 className="font-medium mb-1">{service.name}</h4>
                          <p className="text-xs opacity-80">{service.details}</p>
                          <p className="text-xs opacity-60 mt-1">Uptime: {service.uptime}</p>
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
                    {activeJobs.map((job) => (
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
                            <div className="flex items-center gap-2 text-xs">
                              <span className={`px-2 py-1 rounded ${getJobTypeColor(job.type)}`}>
                                {getJobTypeLabel(job.type)}
                              </span>
                              <span className="text-gray-400">• {job.user}</span>
                              <span className="text-gray-500">• {job.startedAt}</span>
                            </div>
                          </div>

                          {job.status === 'running' ? (
                            <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
                          ) : job.status === 'failed' ? (
                            <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                          ) : (
                            <Clock className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                          )}
                        </div>

                        {job.status === 'running' && (
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

                        {job.status === 'failed' && (
                          <button
                            type="button"
                            className="w-full mt-2 py-2 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded text-red-400 text-sm transition-colors"
                          >
                            재시도
                          </button>
                        )}
                      </div>
                    ))}
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
                    {recentEvents.map((event) => (
                      <div
                        key={event.id}
                        className="flex items-start gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <div className="mt-0.5">
                          {getEventIcon(event.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-300 text-sm">{event.message}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-gray-500 text-xs">{event.time}</p>
                            <span className="text-gray-600">•</span>
                            <p className="text-gray-500 text-xs">{event.user}</p>
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
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-blue-400" />
                          <span className="text-gray-400 text-sm">CPU</span>
                        </div>
                        <span className="text-white text-sm font-medium">45%</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '45%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-green-400" />
                          <span className="text-gray-400 text-sm">메모리</span>
                        </div>
                        <span className="text-white text-sm font-medium">62%</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '62%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <HardDrive className="w-4 h-4 text-purple-400" />
                          <span className="text-gray-400 text-sm">디스크</span>
                        </div>
                        <span className="text-white text-sm font-medium">78%</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2">
                        <div className="bg-purple-500 h-2 rounded-full" style={{ width: '78%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-yellow-400" />
                          <span className="text-gray-400 text-sm">큐 사용률</span>
                        </div>
                        <span className="text-white text-sm font-medium">34%</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '34%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Alerts */}
                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-4">알림</h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />
                        <div>
                          <p className="text-yellow-400 text-sm font-medium">높은 부하 감지</p>
                          <p className="text-yellow-400/80 text-xs mt-1">Ollama worker 부하 85%</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <div className="flex items-start gap-2">
                        <FileWarning className="w-4 h-4 text-red-400 mt-0.5" />
                        <div>
                          <p className="text-red-400 text-sm font-medium">실패한 작업 증가</p>
                          <p className="text-red-400/80 text-xs mt-1">최근 1시간 5개 실패</p>
                        </div>
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
