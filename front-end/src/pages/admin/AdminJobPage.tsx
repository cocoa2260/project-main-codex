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
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  Eye,
  Trash2,
  Brain,
  Sparkles,
  Database,
  Zap,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Cpu
} from 'lucide-react';

interface Job {
  id: string;
  documentName: string;
  owner: string;
  type: 'ocr' | 'summary' | 'embedding' | 'rag';
  status: 'running' | 'waiting' | 'completed' | 'failed' | 'cancelled';
  stage?: string;
  progress: number;
  duration: string;
  queue: string;
  worker?: string;
  createdTime: string;
  error?: string;
  retryCount?: number;
}

interface Worker {
  id: string;
  name: string;
  status: 'active' | 'idle' | 'offline';
  currentQueue?: string;
  load: number;
  jobsProcessed: number;
}

interface AdminJobPageProps {
  onLogout?: () => void;
}

export function AdminJobPage({ onLogout }: AdminJobPageProps) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'running' | 'waiting' | 'completed' | 'failed'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: Home },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'jobs', label: 'Jobs', icon: Activity },
    { id: 'system', label: 'System', icon: Shield },
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
    { label: '전체 작업', value: '2,345', change: '+156', icon: Activity, color: 'primary' },
    { label: '실행 중', value: '23', change: '+5', icon: Loader2, color: 'blue', animate: true },
    { label: '완료', value: '2,287', change: '+148', icon: CheckCircle2, color: 'green' },
    { label: '실패', value: '15', change: '+3', icon: XCircle, color: 'red' },
    { label: '대기 중', value: '20', change: '+8', icon: Clock, color: 'yellow' },
    { label: 'Worker 사용률', value: '78%', change: '+12%', icon: Cpu, color: 'purple' }
  ];

  const jobs: Job[] = [
    {
      id: 'job-001',
      documentName: '계약서_검토본.pdf',
      owner: '김철수',
      type: 'ocr',
      status: 'running',
      stage: 'Text Extraction',
      progress: 65,
      duration: '2m 15s',
      queue: 'ocr-queue',
      worker: 'worker-1',
      createdTime: '14:30:00'
    },
    {
      id: 'job-002',
      documentName: '프로젝트_제안서.pdf',
      owner: '이영희',
      type: 'summary',
      status: 'running',
      stage: 'AI Processing',
      progress: 45,
      duration: '5m 30s',
      queue: 'summary-queue',
      worker: 'worker-2',
      createdTime: '14:25:00'
    },
    {
      id: 'job-003',
      documentName: '보고서_Q1.pdf',
      owner: '박민수',
      type: 'embedding',
      status: 'waiting',
      progress: 0,
      duration: '-',
      queue: 'embedding-queue',
      createdTime: '14:35:00'
    },
    {
      id: 'job-004',
      documentName: '기술문서_API.pdf',
      owner: '정수진',
      type: 'ocr',
      status: 'failed',
      stage: 'OCR Processing',
      progress: 35,
      duration: '3m 20s',
      queue: 'ocr-queue',
      createdTime: '14:20:00',
      error: 'OCR processing timeout after 180s',
      retryCount: 2
    },
    {
      id: 'job-005',
      documentName: '회의록_0515.pdf',
      owner: '최민지',
      type: 'rag',
      status: 'completed',
      progress: 100,
      duration: '8m 45s',
      queue: 'rag-queue',
      worker: 'worker-3',
      createdTime: '14:15:00'
    }
  ];

  const workers: Worker[] = [
    {
      id: 'worker-1',
      name: 'OCR Worker 1',
      status: 'active',
      currentQueue: 'ocr-queue',
      load: 78,
      jobsProcessed: 145
    },
    {
      id: 'worker-2',
      name: 'Summary Worker 1',
      status: 'active',
      currentQueue: 'summary-queue',
      load: 65,
      jobsProcessed: 89
    },
    {
      id: 'worker-3',
      name: 'Embedding Worker 1',
      status: 'idle',
      load: 0,
      jobsProcessed: 234
    },
    {
      id: 'worker-4',
      name: 'RAG Worker 1',
      status: 'offline',
      load: 0,
      jobsProcessed: 156
    }
  ];

  const activityLog = [
    { time: '14:40', message: 'Embedding job completed', type: 'success' as const },
    { time: '14:35', message: 'Summary job started', type: 'info' as const },
    { time: '14:32', message: 'OCR progress: 65%', type: 'info' as const },
    { time: '14:30', message: 'OCR job started', type: 'info' as const },
    { time: '14:25', message: 'Job failed: OCR timeout', type: 'error' as const }
  ];

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.documentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         job.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterStatus === 'all' ? true :
      filterStatus === 'running' ? job.status === 'running' :
      filterStatus === 'waiting' ? job.status === 'waiting' :
      filterStatus === 'completed' ? job.status === 'completed' :
      filterStatus === 'failed' ? job.status === 'failed' : true;

    return matchesSearch && matchesFilter;
  });

  const getJobTypeLabel = (type: Job['type']) => {
    switch (type) {
      case 'ocr': return 'OCR';
      case 'summary': return 'AI 요약';
      case 'embedding': return '임베딩';
      case 'rag': return 'RAG';
    }
  };

  const getJobTypeColor = (type: Job['type']) => {
    switch (type) {
      case 'ocr': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'summary': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'embedding': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'rag': return 'bg-green-500/10 text-green-400 border-green-500/20';
    }
  };

  const getStatusColor = (status: Job['status']) => {
    switch (status) {
      case 'running': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'waiting': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
      case 'completed': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'failed': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'cancelled': return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    }
  };

  const getStatusLabel = (status: Job['status']) => {
    switch (status) {
      case 'running': return '실행 중';
      case 'waiting': return '대기';
      case 'completed': return '완료';
      case 'failed': return '실패';
      case 'cancelled': return '취소됨';
    }
  };

  const getWorkerStatusColor = (status: Worker['status']) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'idle': return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'offline': return 'bg-red-500/10 text-red-400 border-red-500/20';
    }
  };

  const getActivityIcon = (type: 'success' | 'error' | 'warning' | 'info') => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />;
      case 'error': return <XCircle className="w-3.5 h-3.5 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />;
      default: return <Activity className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  const failedJobs = jobs.filter(j => j.status === 'failed');
  const queueStats = [
    { name: 'OCR Queue', count: 8, color: 'blue' },
    { name: 'Summary Queue', count: 5, color: 'purple' },
    { name: 'Embedding Queue', count: 4, color: 'yellow' },
    { name: 'RAG Queue', count: 3, color: 'green' }
  ];

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
                        {filteredJobs.map((job) => (
                          <tr key={job.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <code className="text-primary text-xs font-mono">{job.id}</code>
                            </td>
                            <td className="px-6 py-4">
                              <div className="min-w-0 max-w-xs">
                                <p className="text-white text-sm font-medium truncate">{job.documentName}</p>
                                <p className="text-gray-400 text-xs truncate">{job.owner}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2.5 py-1 border rounded-lg text-xs font-medium ${getJobTypeColor(job.type)}`}>
                                {getJobTypeLabel(job.type)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {job.status === 'running' ? (
                                <div className="w-32">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-gray-400">{job.progress}%</span>
                                  </div>
                                  <div className="w-full bg-white/5 rounded-full h-1.5">
                                    <div
                                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full transition-all"
                                      style={{ width: `${job.progress}%` }}
                                    />
                                  </div>
                                  {job.stage && <p className="text-xs text-gray-500 mt-1">{job.stage}</p>}
                                </div>
                              ) : job.status === 'completed' ? (
                                <span className="text-green-400 text-sm">100%</span>
                              ) : job.status === 'failed' ? (
                                <span className="text-red-400 text-sm">{job.progress}%</span>
                              ) : (
                                <span className="text-yellow-400 text-sm">대기</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-xs font-medium ${getStatusColor(job.status)}`}>
                                {job.status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
                                {job.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                                {job.status === 'failed' && <XCircle className="w-3 h-3" />}
                                {job.status === 'waiting' && <Clock className="w-3 h-3" />}
                                {getStatusLabel(job.status)}
                              </span>
                              {job.error && (
                                <p className="text-xs text-red-400/80 mt-1 max-w-xs truncate">{job.error}</p>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {job.worker || '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm">
                                <p className="text-white">{job.duration}</p>
                                <p className="text-gray-500 text-xs">{job.createdTime}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2">
                                {job.status === 'failed' && (
                                  <button
                                    type="button"
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                    title="재시도"
                                  >
                                    <RefreshCw className="w-4 h-4 text-yellow-400" />
                                  </button>
                                )}
                                {job.status === 'running' && (
                                  <button
                                    type="button"
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                    title="취소"
                                  >
                                    <XCircle className="w-4 h-4 text-red-400" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                  title="상세보기"
                                >
                                  <Eye className="w-4 h-4 text-gray-400" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Worker monitoring */}
                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-primary" />
                    Worker 상태
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {workers.map((worker) => (
                      <div
                        key={worker.id}
                        className={`p-4 border rounded-lg ${getWorkerStatusColor(worker.status)}`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-sm">{worker.name}</h4>
                          <div className={`w-2 h-2 rounded-full ${
                            worker.status === 'active' ? 'bg-green-400 animate-pulse' :
                            worker.status === 'idle' ? 'bg-yellow-400' :
                            'bg-red-400'
                          }`} />
                        </div>
                        {worker.currentQueue && (
                          <p className="text-xs opacity-80 mb-2">{worker.currentQueue}</p>
                        )}
                        <div className="space-y-2">
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="opacity-80">부하</span>
                              <span className="font-medium">{worker.load}%</span>
                            </div>
                            <div className="w-full bg-black/20 rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full"
                                style={{
                                  width: `${worker.load}%`,
                                  backgroundColor: worker.status === 'active' ? 'rgb(74 222 128)' : 'rgb(250 204 21)'
                                }}
                              />
                            </div>
                          </div>
                          <p className="text-xs opacity-60">처리: {worker.jobsProcessed}</p>
                        </div>
                      </div>
                    ))}
                  </div>
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
                          <p className="text-white text-sm font-medium mb-1 line-clamp-1">{job.documentName}</p>
                          <p className="text-red-400/80 text-xs mb-2 line-clamp-2">{job.error}</p>
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-gray-400">Retry: {job.retryCount || 0}</span>
                            <span className={`px-2 py-0.5 rounded ${getJobTypeColor(job.type)}`}>
                              {getJobTypeLabel(job.type)}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="w-full py-1.5 px-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded text-red-400 text-xs transition-colors flex items-center justify-center gap-1.5"
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
                  <div className="space-y-3">
                    {queueStats.map((queue) => (
                      <div key={queue.name} className="p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white text-sm font-medium">{queue.name}</span>
                          <span className={`text-${queue.color}-400 text-sm font-bold`}>
                            {queue.count}
                          </span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-1.5">
                          <div
                            className={`bg-${queue.color}-500 h-1.5 rounded-full transition-all`}
                            style={{ width: `${(queue.count / 20) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Live activity */}
                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    실시간 활동
                  </h3>
                  <div className="space-y-3">
                    {activityLog.map((log, idx) => (
                      <div
                        key={idx}
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
