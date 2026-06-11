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
  UserPlus,
  Filter,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Ban,
  UserCheck,
  UserX,
  Edit,
  Trash2,
  Calendar,
  Activity,
  TrendingUp,
  ChevronRight,
  RefreshCw,
  Download
} from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: 'USER' | 'ADMIN' | 'MANAGER';
  status: 'active' | 'suspended' | 'inactive';
  uploadCount: number;
  documentCount: number;
  lastActive: string;
  createdDate: string;
}

interface AdminUserPageProps {
  onLogout?: () => void;
}

export function AdminUserPage({ onLogout }: AdminUserPageProps) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'admin' | 'suspended'>('all');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);

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
    { label: '전체 사용자', value: '1,234', change: '+5.2%', icon: Users, color: 'primary' },
    { label: '활성 사용자', value: '1,156', change: '+3.1%', icon: UserCheck, color: 'green' },
    { label: '관리자', value: '12', change: '+1', icon: Shield, color: 'red' },
    { label: '오늘 신규', value: '23', change: '+8', icon: UserPlus, color: 'blue' },
    { label: '중지된 계정', value: '8', change: '-2', icon: UserX, color: 'yellow' },
    { label: '업로드 활동', value: '892', change: '+15%', icon: Upload, color: 'purple' }
  ];

  const users: UserData[] = [
    {
      id: '1',
      name: '김철수',
      email: 'kim@example.com',
      role: 'ADMIN',
      status: 'active',
      uploadCount: 45,
      documentCount: 156,
      lastActive: '5분 전',
      createdDate: '2024-01-15'
    },
    {
      id: '2',
      name: '이영희',
      email: 'lee@example.com',
      role: 'USER',
      status: 'active',
      uploadCount: 32,
      documentCount: 98,
      lastActive: '1시간 전',
      createdDate: '2024-02-20'
    },
    {
      id: '3',
      name: '박민수',
      email: 'park@example.com',
      role: 'MANAGER',
      status: 'active',
      uploadCount: 28,
      documentCount: 87,
      lastActive: '2시간 전',
      createdDate: '2024-03-10'
    },
    {
      id: '4',
      name: '정수진',
      email: 'jung@example.com',
      role: 'USER',
      status: 'suspended',
      uploadCount: 12,
      documentCount: 45,
      lastActive: '2일 전',
      createdDate: '2024-04-05'
    },
    {
      id: '5',
      name: '최민지',
      email: 'choi@example.com',
      role: 'USER',
      status: 'active',
      uploadCount: 18,
      documentCount: 62,
      lastActive: '방금',
      createdDate: '2024-05-01'
    },
    {
      id: '6',
      name: '홍길동',
      email: 'hong@example.com',
      role: 'USER',
      status: 'inactive',
      uploadCount: 5,
      documentCount: 12,
      lastActive: '1주일 전',
      createdDate: '2024-05-20'
    }
  ];

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterStatus === 'all' ? true :
      filterStatus === 'active' ? user.status === 'active' :
      filterStatus === 'admin' ? user.role === 'ADMIN' :
      filterStatus === 'suspended' ? user.status === 'suspended' : true;

    return matchesSearch && matchesFilter;
  });

  const getRoleColor = (role: UserData['role']) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'MANAGER':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  const getStatusColor = (status: UserData['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'suspended':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    }
  };

  const getStatusLabel = (status: UserData['status']) => {
    switch (status) {
      case 'active':
        return '활성';
      case 'suspended':
        return '중지됨';
      default:
        return '비활성';
    }
  };

  const recentUsers = users.slice(0, 3);
  const topUsers = [...users].sort((a, b) => b.uploadCount - a.uploadCount).slice(0, 3);

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
                placeholder="사용자 검색..."
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
                <h2 className="text-2xl font-bold text-white mb-1">사용자 관리</h2>
                <p className="text-gray-400">총 {users.length}명의 사용자</p>
              </div>
              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-blue-500 text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                <UserPlus className="w-4 h-4" />
                <span className="font-medium">새 사용자 추가</span>
              </button>
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
              {/* User table */}
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
                    onClick={() => setFilterStatus('active')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filterStatus === 'active'
                        ? 'bg-primary text-white'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    활성
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus('admin')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filterStatus === 'admin'
                        ? 'bg-primary text-white'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    관리자
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterStatus('suspended')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filterStatus === 'suspended'
                        ? 'bg-primary text-white'
                        : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    중지됨
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
                            사용자
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            역할
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            상태
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            업로드
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            문서
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            마지막 활동
                          </th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                            액션
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredUsers.map((user) => (
                          <tr
                            key={user.id}
                            className="hover:bg-white/5 transition-colors cursor-pointer"
                            onClick={() => {
                              setSelectedUser(user);
                              setShowUserDetail(true);
                            }}
                          >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                                  <User className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                  <p className="text-white font-medium text-sm">{user.name}</p>
                                  <p className="text-gray-400 text-xs">{user.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-xs font-medium ${getRoleColor(user.role)}`}>
                                {user.role === 'ADMIN' && <Shield className="w-3 h-3" />}
                                {user.role}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-xs font-medium ${getStatusColor(user.status)}`}>
                                {user.status === 'active' ? (
                                  <CheckCircle2 className="w-3 h-3" />
                                ) : user.status === 'suspended' ? (
                                  <Ban className="w-3 h-3" />
                                ) : (
                                  <XCircle className="w-3 h-3" />
                                )}
                                {getStatusLabel(user.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {user.uploadCount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                              {user.documentCount}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                              {user.lastActive}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                  title="수정"
                                >
                                  <Edit className="w-4 h-4 text-gray-400" />
                                </button>
                                {user.status === 'active' ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                    }}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                    title="중지"
                                  >
                                    <Ban className="w-4 h-4 text-yellow-400" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                    }}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                    title="활성화"
                                  >
                                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
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
                {/* Recent registrations */}
                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-4">최근 가입</h3>
                  <div className="space-y-3">
                    {recentUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{user.name}</p>
                          <p className="text-gray-400 text-xs truncate">{user.email}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top users */}
                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    활발한 사용자
                  </h3>
                  <div className="space-y-3">
                    {topUsers.map((user, idx) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-3 bg-white/5 rounded-lg"
                      >
                        <div className="flex items-center justify-center w-6 h-6 bg-primary/20 rounded-full text-primary text-xs font-bold flex-shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{user.name}</p>
                          <p className="text-gray-400 text-xs">{user.uploadCount} 업로드</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* User growth */}
                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-4">사용자 증가</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-400 text-sm">이번 주</span>
                        <span className="text-green-400 text-sm font-medium">+15%</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '75%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-400 text-sm">이번 달</span>
                        <span className="text-blue-400 text-sm font-medium">+42%</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '88%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* User detail drawer */}
      {showUserDetail && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-end justify-end">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowUserDetail(false)}
          />
          <div className="relative w-full md:w-[480px] h-full bg-[#111116] border-l border-white/10 overflow-auto">
            <div className="sticky top-0 bg-[#111116]/80 backdrop-blur-xl border-b border-white/10 p-6 z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold text-xl">사용자 정보</h3>
                <button
                  type="button"
                  onClick={() => setShowUserDetail(false)}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-semibold text-lg">{selectedUser.name}</h4>
                  <p className="text-gray-400">{selectedUser.email}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-white font-medium mb-3">기본 정보</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-gray-400 text-sm">역할</span>
                    <span className={`px-2.5 py-1 border rounded-lg text-xs font-medium ${getRoleColor(selectedUser.role)}`}>
                      {selectedUser.role}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-gray-400 text-sm">상태</span>
                    <span className={`px-2.5 py-1 border rounded-lg text-xs font-medium ${getStatusColor(selectedUser.status)}`}>
                      {getStatusLabel(selectedUser.status)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-gray-400 text-sm">가입일</span>
                    <span className="text-white text-sm">{selectedUser.createdDate}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-400 text-sm">마지막 활동</span>
                    <span className="text-white text-sm">{selectedUser.lastActive}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-white font-medium mb-3">활동 통계</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                    <p className="text-gray-400 text-sm mb-1">총 업로드</p>
                    <p className="text-white text-2xl font-bold">{selectedUser.uploadCount}</p>
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                    <p className="text-gray-400 text-sm mb-1">총 문서</p>
                    <p className="text-white text-2xl font-bold">{selectedUser.documentCount}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-white font-medium mb-3">액션</h4>
                <div className="space-y-2">
                  <button
                    type="button"
                    className="w-full py-3 px-4 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-lg transition-colors font-medium"
                  >
                    역할 변경
                  </button>
                  {selectedUser.status === 'active' ? (
                    <button
                      type="button"
                      className="w-full py-3 px-4 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-400 rounded-lg transition-colors font-medium"
                    >
                      계정 중지
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="w-full py-3 px-4 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 text-green-400 rounded-lg transition-colors font-medium"
                    >
                      계정 활성화
                    </button>
                  )}
                  <button
                    type="button"
                    className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-lg transition-colors font-medium"
                  >
                    비밀번호 재설정
                  </button>
                  <button
                    type="button"
                    className="w-full py-3 px-4 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg transition-colors font-medium"
                  >
                    계정 삭제
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
