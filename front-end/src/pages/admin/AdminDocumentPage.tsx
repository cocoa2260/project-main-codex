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
  Filter,
  RefreshCw,
  Download,
  Trash2,
  Eye,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  MoreVertical,
  Calendar,
  FileType,
  Layers,
  Brain,
  Sparkles,
  Database,
  Activity,
  TrendingUp,
  AlertTriangle,
  PlayCircle
} from 'lucide-react';

interface DocumentData {
  id: string;
  name: string;
  owner: string;
  uploadDate: string;
  size: string;
  pages: number;
  category?: string;
  stage: 'upload' | 'ocr' | 'summary' | 'embedding' | 'rag';
  progress: number;
  status: 'processing' | 'completed' | 'failed' | 'waiting';
  error?: string;
}

interface AdminDocumentPageProps {
  onLogout?: () => void;
}

export function AdminDocumentPage({ onLogout }: AdminDocumentPageProps) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'processing' | 'completed' | 'failed'>('all');

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
    { label: '전체 문서', value: '8,456', change: '+12.8%', icon: FileText, color: 'primary' },
    { label: '처리 중', value: '23', change: '+5', icon: Loader2, color: 'blue', animate: true },
    { label: '처리 완료', value: '8,128', change: '+11.2%', icon: CheckCircle2, color: 'green' },
    { label: '실패', value: '15', change: '+3', icon: XCircle, color: 'red' },
    { label: '대기 큐', value: '12', change: '+4', icon: Clock, color: 'yellow' },
    { label: '오늘 업로드', value: '156', change: '+23', icon: Upload, color: 'purple' }
  ];

  const documents: DocumentData[] = [
    {
      id: '1',
      name: '프로젝트_제안서_2024.pdf',
      owner: '김철수',
      uploadDate: '2024-05-27 14:30',
      size: '2.4 MB',
      pages: 15,
      category: '제안서',
      stage: 'rag',
      progress: 100,
      status: 'completed'
    },
    {
      id: '2',
      name: '계약서_검토본.pdf',
      owner: '이영희',
      uploadDate: '2024-05-27 13:15',
      size: '1.2 MB',
      pages: 8,
      category: '계약서',
      stage: 'summary',
      progress: 65,
      status: 'processing'
    },
    {
      id: '3',
      name: '회의록_0515.pdf',
      owner: '박민수',
      uploadDate: '2024-05-27 12:00',
      size: '0.8 MB',
      pages: 3,
      category: '회의록',
      stage: 'rag',
      progress: 100,
      status: 'completed'
    },
    {
      id: '4',
      name: '기술문서_API.pdf',
      owner: '정수진',
      uploadDate: '2024-05-27 11:45',
      size: '3.1 MB',
      pages: 22,
      category: '기술문서',
      stage: 'ocr',
      progress: 35,
      status: 'failed',
      error: 'OCR processing timeout'
    },
    {
      id: '5',
      name: '보고서_Q1_2024.pdf',
      owner: '최민지',
      uploadDate: '2024-05-26 16:20',
      size: '4.5 MB',
      pages: 28,
      category: '보고서',
      stage: 'rag',
      progress: 100,
      status: 'completed'
    },
    {
      id: '6',
      name: '사용자_매뉴얼.pdf',
      owner: '홍길동',
      uploadDate: '2024-05-26 14:10',
      size: '1.8 MB',
      pages: 12,
      category: '매뉴얼',
      stage: 'ocr',
      progress: 0,
      status: 'waiting'
    }
  ];

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.owner.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         doc.category?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterStatus === 'all' ? true :
      filterStatus === 'processing' ? doc.status === 'processing' || doc.status === 'waiting' :
      filterStatus === 'completed' ? doc.status === 'completed' :
      filterStatus === 'failed' ? doc.status === 'failed' : true;

    return matchesSearch && matchesFilter;
  });

  const getStageLabel = (stage: DocumentData['stage']) => {
    switch (stage) {
      case 'upload': return '업로드';
      case 'ocr': return 'OCR';
      case 'summary': return 'AI 요약';
      case 'embedding': return '임베딩';
      case 'rag': return 'RAG 준비';
    }
  };

  const getStageColor = (stage: DocumentData['stage']) => {
    switch (stage) {
      case 'upload': return 'bg-gray-500/10 text-gray-400';
      case 'ocr': return 'bg-blue-500/10 text-blue-400';
      case 'summary': return 'bg-purple-500/10 text-purple-400';
      case 'embedding': return 'bg-yellow-500/10 text-yellow-400';
      case 'rag': return 'bg-green-500/10 text-green-400';
    }
  };

  const getStatusColor = (status: DocumentData['status']) => {
    switch (status) {
      case 'processing': return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'completed': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'failed': return 'text-red-400 bg-red-500/10 border-red-500/20';
      case 'waiting': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
    }
  };

  const getStatusLabel = (status: DocumentData['status']) => {
    switch (status) {
      case 'processing': return '처리 중';
      case 'completed': return '완료';
      case 'failed': return '실패';
      case 'waiting': return '대기';
    }
  };

  const recentUploads = documents.slice(0, 3);
  const failedDocs = documents.filter(d => d.status === 'failed');
  const processingDocs = documents.filter(d => d.status === 'processing' || d.status === 'waiting');

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
                placeholder="문서 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 lg:w-96 pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
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

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-[1800px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">문서 관리</h2>
                <p className="text-gray-400">총 {documents.length}개의 문서</p>
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
              {/* Document table */}
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
                    onClick={() => setFilterStatus('processing')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filterStatus === 'processing'
                        ? 'bg-primary text-white'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
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

                  <div className="flex-1" />

                  <button
                    type="button"
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    type="button"
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                {/* Table */}
                <div className="bg-[#111116] border border-white/10 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            문서명
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            소유자
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            업로드
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            크기
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            단계
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            진행률
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            상태
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                            액션
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredDocuments.map((doc) => (
                          <tr key={doc.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                  <FileText className="w-4 h-4 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-white font-medium text-sm truncate max-w-xs">{doc.name}</p>
                                  {doc.category && (
                                    <span className="inline-block px-2 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-gray-400 mt-1">
                                      {doc.category}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {doc.owner}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                {doc.uploadDate}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              <div className="flex items-center gap-1.5">
                                <FileType className="w-3.5 h-3.5 text-gray-400" />
                                {doc.size}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${getStageColor(doc.stage)}`}>
                                {getStageLabel(doc.stage)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {doc.status === 'processing' || doc.status === 'waiting' ? (
                                <div className="w-32">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-gray-400">{doc.progress}%</span>
                                  </div>
                                  <div className="w-full bg-white/5 rounded-full h-1.5">
                                    <div
                                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-1.5 rounded-full transition-all duration-500"
                                      style={{ width: `${doc.progress}%` }}
                                    />
                                  </div>
                                </div>
                              ) : doc.status === 'completed' ? (
                                <span className="text-sm text-green-400">100%</span>
                              ) : (
                                <span className="text-sm text-red-400">{doc.progress}%</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-xs font-medium ${getStatusColor(doc.status)}`}>
                                {doc.status === 'processing' && <Loader2 className="w-3 h-3 animate-spin" />}
                                {doc.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                                {doc.status === 'failed' && <XCircle className="w-3 h-3" />}
                                {doc.status === 'waiting' && <Clock className="w-3 h-3" />}
                                {getStatusLabel(doc.status)}
                              </span>
                              {doc.error && (
                                <p className="text-xs text-red-400/80 mt-1">{doc.error}</p>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2">
                                {doc.status === 'completed' && (
                                  <>
                                    <button
                                      type="button"
                                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                      title="요약 보기"
                                    >
                                      <Eye className="w-4 h-4 text-gray-400" />
                                    </button>
                                    <button
                                      type="button"
                                      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                      title="채팅"
                                    >
                                      <MessageSquare className="w-4 h-4 text-gray-400" />
                                    </button>
                                  </>
                                )}
                                {doc.status === 'failed' && (
                                  <button
                                    type="button"
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                    title="재시도"
                                  >
                                    <RefreshCw className="w-4 h-4 text-yellow-400" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                  title="다운로드"
                                >
                                  <Download className="w-4 h-4 text-gray-400" />
                                </button>
                                <button
                                  type="button"
                                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                >
                                  <MoreVertical className="w-4 h-4 text-gray-400" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right panel */}
              <div className="space-y-6">
                {/* Recent uploads */}
                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-4">최근 업로드</h3>
                  <div className="space-y-3">
                    {recentUploads.map((doc) => (
                      <div
                        key={doc.id}
                        className="p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <FileText className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <p className="text-white text-sm font-medium line-clamp-1">{doc.name}</p>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">{doc.owner}</span>
                          <span className={`px-2 py-0.5 rounded ${getStageColor(doc.stage)}`}>
                            {getStageLabel(doc.stage)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Failed documents */}
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
                          <p className="text-white text-sm font-medium mb-1 line-clamp-1">{doc.name}</p>
                          <p className="text-red-400/80 text-xs mb-2">{doc.error}</p>
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

                {/* Queue status */}
                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-4">큐 상태</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-400 text-sm">처리 중</span>
                        <span className="text-white text-sm font-medium">
                          {processingDocs.filter(d => d.status === 'processing').length}
                        </span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '60%' }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-400 text-sm">대기</span>
                        <span className="text-white text-sm font-medium">
                          {processingDocs.filter(d => d.status === 'waiting').length}
                        </span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2">
                        <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '40%' }} />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-green-400 text-sm">작업 처리 중</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Processing distribution */}
                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    처리 분포
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">OCR</span>
                      <span className="text-blue-400 text-sm font-medium">35%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">AI 요약</span>
                      <span className="text-purple-400 text-sm font-medium">28%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">임베딩</span>
                      <span className="text-yellow-400 text-sm font-medium">22%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400 text-sm">RAG 준비</span>
                      <span className="text-green-400 text-sm font-medium">15%</span>
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
