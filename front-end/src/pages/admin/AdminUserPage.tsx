import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAdminUserDetail, getAdminUsers, updateAdminUserRole, updateAdminUserStatus } from '../../api/admin';
import { Sidebar } from '../../components/common/Sidebar';
import type { AdminUserDetail, AdminUserItem, AdminUserRecentTask, AdminUserStatus } from '../../types/admin';
import type { TaskStatus } from '../../types/document';
import type { UserRole } from '../../utils/auth';
import { getDocumentStatusPresentation, normalizeDocumentStatus } from '../../utils/documentStatus';
import {
  Activity,
  AlertCircle,
  Ban,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Download,
  Edit,
  Loader2,
  Menu,
  MoreVertical,
  RefreshCw,
  Search,
  Shield,
  TrendingUp,
  Upload,
  User,
  UserCheck,
  UserPlus,
  Users,
  UserX,
  X,
  XCircle,
} from 'lucide-react';

type FilterStatus = 'all' | 'user' | 'admin' | 'active' | 'suspended' | 'inactive';

interface AdminUserPageProps {
  onLogout?: () => void;
}

const PAGE_LIMIT = 20;

const roleFilterMap: Partial<Record<FilterStatus, UserRole>> = {
  user: 'USER',
  admin: 'ADMIN',
};

const statusFilterMap: Partial<Record<FilterStatus, AdminUserStatus>> = {
  active: 'ACTIVE',
  suspended: 'SUSPENDED',
  inactive: 'INACTIVE',
};

const USER_STATUS_OPTIONS: AdminUserStatus[] = ['ACTIVE', 'SUSPENDED', 'INACTIVE'];

function getApiErrorMessage(error: unknown): string {
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
      .join(', ') || '요청을 처리하지 못했습니다.';
  }

  if (response?.data?.message) return response.data.message;

  switch (response?.status) {
    case 401:
      return '인증이 필요합니다. 다시 로그인해 주세요.';
    case 403:
      return '이 작업을 수행할 권한이 없습니다.';
    case 404:
      return '사용자를 찾을 수 없습니다.';
    case 409:
      return '현재 정책상 요청을 처리할 수 없습니다.';
    default:
      return error instanceof Error ? error.message : '요청을 처리하지 못했습니다.';
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

function getRoleColor(role: string) {
  switch (role.toUpperCase()) {
    case 'ADMIN':
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    case 'MANAGER':
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    default:
      return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
  }
}

function normalizeUserRole(role: string): UserRole | null {
  const normalized = role.toUpperCase();
  if (normalized === 'ADMIN' || normalized === 'USER') return normalized;
  return null;
}

function getNextRole(role: string): UserRole | null {
  const currentRole = normalizeUserRole(role);
  if (currentRole === 'ADMIN') return 'USER';
  if (currentRole === 'USER') return 'ADMIN';
  return null;
}

function getRoleConfirmMessage(user: AdminUserItem, nextRole: UserRole): string {
  if (nextRole === 'ADMIN') return `${user.name} 사용자를 ADMIN으로 승격하시겠습니까?`;
  return `${user.name} 관리자를 USER로 강등하시겠습니까?`;
}

function normalizeUserStatus(status: string): AdminUserStatus {
  const normalized = status.toUpperCase();
  if (normalized === 'ACTIVE' || normalized === 'SUSPENDED' || normalized === 'INACTIVE') return normalized;
  return 'INACTIVE';
}

function getStatusColor(status: AdminUserStatus) {
  switch (status) {
    case 'ACTIVE':
      return 'bg-green-500/10 text-green-400 border-green-500/20';
    case 'SUSPENDED':
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    default:
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
  }
}

function getStatusLabel(status: AdminUserStatus) {
  switch (status) {
    case 'ACTIVE':
      return '활성';
    case 'SUSPENDED':
      return '중지됨';
    default:
      return '비활성';
  }
}

function getStatusIcon(status: AdminUserStatus) {
  if (status === 'ACTIVE') return <CheckCircle2 className="w-3 h-3" />;
  if (status === 'SUSPENDED') return <Ban className="w-3 h-3" />;
  return <XCircle className="w-3 h-3" />;
}

function getDefaultNextStatus(status: string): AdminUserStatus {
  const currentStatus = normalizeUserStatus(status);
  if (currentStatus === 'SUSPENDED') return 'ACTIVE';
  return 'SUSPENDED';
}

function getStatusConfirmMessage(user: AdminUserItem, nextStatus: AdminUserStatus): string {
  if (nextStatus === 'SUSPENDED') return `${user.name} 사용자를 정지하시겠습니까?`;
  if (nextStatus === 'ACTIVE') return `${user.name} 사용자의 정지를 해제하고 활성 상태로 변경하시겠습니까?`;
  return `${user.name} 사용자를 비활성 상태로 변경하시겠습니까?`;
}

function getTaskStatusLabel(status: string) {
  const normalized = normalizeDocumentStatus(status) as TaskStatus;

  switch (normalized) {
    case 'COMPLETED':
      return '완료';
    case 'FAILED':
      return '실패';
    case 'PROCESSING':
      return '처리 중';
    default:
      return '대기 중';
  }
}

export function AdminUserPage({ onLogout }: AdminUserPageProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: PAGE_LIMIT,
    total: 0,
    total_pages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUserItem | null>(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState<AdminUserDetail | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [detailErrorMessage, setDetailErrorMessage] = useState<string | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [roleActionUser, setRoleActionUser] = useState<AdminUserItem | null>(null);
  const [roleActionError, setRoleActionError] = useState<string | null>(null);
  const [roleActionSuccess, setRoleActionSuccess] = useState<string | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [statusActionUser, setStatusActionUser] = useState<AdminUserItem | null>(null);
  const [statusActionTarget, setStatusActionTarget] = useState<AdminUserStatus>('SUSPENDED');
  const [statusActionReason, setStatusActionReason] = useState('');
  const [statusActionError, setStatusActionError] = useState<string | null>(null);
  const [statusActionSuccess, setStatusActionSuccess] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchUsers = useCallback(async (page: number, showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setErrorMessage(null);

    try {
      const response = await getAdminUsers({
        page,
        limit: PAGE_LIMIT,
        q: searchQuery.trim() || undefined,
        role: roleFilterMap[filterStatus],
        status: statusFilterMap[filterStatus],
        sort_by: 'created_at',
        sort_order: 'desc',
      });

      setUsers(response.items);
      setPagination(response.pagination);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
      setUsers([]);
      setPagination((current) => ({ ...current, page, total: 0, total_pages: 0 }));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [filterStatus, searchQuery]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchUsers(1, true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchUsers]);

  const handleRefresh = () => {
    void fetchUsers(pagination.page, false);
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || (pagination.total_pages > 0 && nextPage > pagination.total_pages)) return;
    void fetchUsers(nextPage, true);
  };

  const handleUserDetail = async (user: AdminUserItem) => {
    setSelectedUser(user);
    setSelectedUserDetail(null);
    setShowUserDetail(true);
    setIsDetailLoading(true);
    setDetailErrorMessage(null);

    try {
      const detail = await getAdminUserDetail(user.id);
      setSelectedUserDetail(detail);
    } catch (error) {
      setDetailErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleOpenRoleAction = (user: AdminUserItem) => {
    setRoleActionUser(user);
    setRoleActionError(null);
    setRoleActionSuccess(null);
  };

  const handleOpenStatusAction = (user: AdminUserItem) => {
    setStatusActionUser(user);
    setStatusActionTarget(getDefaultNextStatus(user.status));
    setStatusActionReason('');
    setStatusActionError(null);
    setStatusActionSuccess(null);
  };

  const handleConfirmRoleUpdate = async () => {
    if (!roleActionUser || isUpdatingRole) return;

    const nextRole = getNextRole(roleActionUser.role);
    if (!nextRole) {
      setRoleActionError('지원하지 않는 역할 값입니다.');
      return;
    }

    setIsUpdatingRole(true);
    setRoleActionError(null);
    setRoleActionSuccess(null);

    try {
      const updatedUser = await updateAdminUserRole(roleActionUser.id, nextRole);

      setUsers((currentUsers) => currentUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
      setSelectedUser((currentUser) => (currentUser?.id === updatedUser.id ? updatedUser : currentUser));
      setRoleActionUser(null);
      setRoleActionSuccess(`${updatedUser.name} 사용자의 역할을 ${updatedUser.role}로 변경했습니다.`);

      await fetchUsers(pagination.page, false);

      if (showUserDetail && selectedUser?.id === updatedUser.id) {
        setIsDetailLoading(true);
        setDetailErrorMessage(null);

        try {
          const detail = await getAdminUserDetail(updatedUser.id);
          setSelectedUserDetail(detail);
          setSelectedUser(detail);
        } catch (detailError) {
          setDetailErrorMessage(getApiErrorMessage(detailError));
        } finally {
          setIsDetailLoading(false);
        }
      }
    } catch (error) {
      setRoleActionError(getApiErrorMessage(error));
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleConfirmStatusUpdate = async () => {
    if (!statusActionUser || isUpdatingStatus) return;

    const currentStatus = normalizeUserStatus(statusActionUser.status);
    if (currentStatus === statusActionTarget) {
      setStatusActionError('현재 상태와 동일한 값입니다.');
      return;
    }

    setIsUpdatingStatus(true);
    setStatusActionError(null);
    setStatusActionSuccess(null);

    try {
      const updatedUser = await updateAdminUserStatus(
        statusActionUser.id,
        statusActionTarget,
        statusActionReason,
      );

      setUsers((currentUsers) => currentUsers.map((user) => (user.id === updatedUser.id ? updatedUser : user)));
      setSelectedUser((currentUser) => (currentUser?.id === updatedUser.id ? updatedUser : currentUser));
      setStatusActionUser(null);
      setStatusActionSuccess(`${updatedUser.name} 사용자의 상태를 ${getStatusLabel(normalizeUserStatus(updatedUser.status))}(으)로 변경했습니다.`);

      await fetchUsers(pagination.page, false);

      if (showUserDetail && selectedUser?.id === updatedUser.id) {
        setIsDetailLoading(true);
        setDetailErrorMessage(null);

        try {
          const detail = await getAdminUserDetail(updatedUser.id);
          setSelectedUserDetail(detail);
          setSelectedUser(detail);
        } catch (detailError) {
          setDetailErrorMessage(getApiErrorMessage(detailError));
        } finally {
          setIsDetailLoading(false);
        }
      }
    } catch (error) {
      setStatusActionError(getApiErrorMessage(error));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const stats = useMemo(() => {
    const adminCount = users.filter((user) => user.role === 'ADMIN').length;
    const activeCount = users.filter((user) => normalizeUserStatus(user.status) === 'ACTIVE').length;
    const suspendedCount = users.filter((user) => normalizeUserStatus(user.status) === 'SUSPENDED').length;
    const totalUploads = users.reduce((sum, user) => sum + user.upload_count, 0);
    const totalDocuments = users.reduce((sum, user) => sum + user.document_count, 0);
    const today = new Date().toDateString();
    const todayUsers = users.filter((user) => {
      const createdAt = new Date(user.created_at);
      return !Number.isNaN(createdAt.getTime()) && createdAt.toDateString() === today;
    }).length;

    return [
      { label: '전체 사용자', value: pagination.total.toLocaleString(), change: `page ${pagination.page}`, icon: Users, color: 'primary' },
      { label: '활성 사용자', value: activeCount.toLocaleString(), change: '현재 페이지', icon: UserCheck, color: 'green' },
      { label: '관리자', value: adminCount.toLocaleString(), change: '현재 페이지', icon: Shield, color: 'red' },
      { label: '오늘 신규', value: todayUsers.toLocaleString(), change: '현재 페이지', icon: UserPlus, color: 'blue' },
      { label: '중지된 계정', value: suspendedCount.toLocaleString(), change: '현재 페이지', icon: UserX, color: 'yellow' },
      { label: '업로드 활동', value: totalUploads.toLocaleString(), change: `${totalDocuments.toLocaleString()} 문서`, icon: Upload, color: 'purple' },
    ];
  }, [pagination.page, pagination.total, users]);

  const recentUsers = useMemo(() => users.slice(0, 3), [users]);
  const topUsers = useMemo(() => [...users].sort((a, b) => b.upload_count - a.upload_count).slice(0, 3), [users]);
  const detailUser = selectedUserDetail ?? selectedUser;
  const roleActionNextRole = roleActionUser ? getNextRole(roleActionUser.role) : null;
  const statusActionCurrentStatus = statusActionUser ? normalizeUserStatus(statusActionUser.status) : null;

  const renderFilterButton = (filter: FilterStatus, label: string, disabled = false) => (
    <button
      type="button"
      onClick={() => !disabled && setFilterStatus(filter)}
      disabled={disabled}
      title={disabled ? 'API 준비중' : undefined}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        filterStatus === filter
          ? 'bg-primary text-white'
          : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
      } ${disabled ? 'opacity-50 cursor-not-allowed hover:bg-white/5 hover:text-gray-400' : ''}`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen w-full bg-[#0a0a0f] flex">
      <Sidebar
        variant="admin"
        sidebarOpen={sidebarOpen}
        onLogout={onLogout}
      />

      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
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
                placeholder="사용자 이름 또는 이메일 검색..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="w-64 lg:w-96 pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="p-2 hover:bg-white/5 rounded-lg transition-colors relative"
              title="알림"
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

        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-[1800px] mx-auto space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">사용자 관리</h2>
                <p className="text-gray-400">총 {pagination.total.toLocaleString()}명의 사용자</p>
              </div>
              <button
                type="button"
                disabled
                title="사용자 생성 API 준비중"
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-gray-500 rounded-lg cursor-not-allowed"
              >
                <UserPlus className="w-4 h-4" />
                <span className="font-medium">새 사용자 추가</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="relative group">
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
              <div className="xl:col-span-3 space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {renderFilterButton('all', '전체')}
                  {renderFilterButton('user', '일반 사용자')}
                  {renderFilterButton('admin', '관리자')}
                  {renderFilterButton('active', '활성')}
                  {renderFilterButton('suspended', '중지됨')}
                  {renderFilterButton('inactive', '비활성')}

                  <div className="flex-1" />

                  <button
                    type="button"
                    disabled
                    title="내보내기 API 준비중"
                    className="p-2 bg-white/5 border border-white/10 rounded-lg opacity-50 cursor-not-allowed"
                  >
                    <Download className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors disabled:opacity-60"
                    title="새로고침"
                  >
                    <RefreshCw className={`w-4 h-4 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {errorMessage && (
                  <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {statusActionSuccess && (
                  <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-300 text-sm">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>{statusActionSuccess}</span>
                  </div>
                )}

                <div className="bg-[#111116] border border-white/10 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white/5 border-b border-white/10">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">사용자</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">역할</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">상태</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">업로드</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">문서</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">가입일</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">액션</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {isLoading && (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                              <div className="flex items-center justify-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>사용자를 불러오는 중입니다.</span>
                              </div>
                            </td>
                          </tr>
                        )}

                        {!isLoading && users.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                              조회된 사용자가 없습니다.
                            </td>
                          </tr>
                        )}

                        {!isLoading && users.map((user) => {
                          const displayStatus = normalizeUserStatus(user.status);

                          return (
                            <tr
                              key={user.id}
                              className="hover:bg-white/5 transition-colors cursor-pointer"
                              onClick={() => void handleUserDetail(user)}
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
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-xs font-medium ${getStatusColor(displayStatus)}`}>
                                  {getStatusIcon(displayStatus)}
                                  {getStatusLabel(displayStatus)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{user.upload_count}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{user.document_count}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{formatDateTime(user.created_at)}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={(event) => event.stopPropagation()}
                                    disabled
                                    className="p-2 rounded-lg opacity-50 cursor-not-allowed"
                                    title="수정 API 준비중"
                                  >
                                    <Edit className="w-4 h-4 text-gray-400" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleOpenStatusAction(user);
                                    }}
                                    disabled={isUpdatingStatus && statusActionUser?.id === user.id}
                                    className="p-2 rounded-lg hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                    title="계정 상태 변경"
                                  >
                                    {isUpdatingStatus && statusActionUser?.id === user.id ? (
                                      <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                                    ) : (
                                      <Ban className="w-4 h-4 text-yellow-400" />
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(event) => event.stopPropagation()}
                                    disabled
                                    className="p-2 rounded-lg opacity-50 cursor-not-allowed"
                                    title="추가 액션 API 준비중"
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

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-gray-400">
                  <span>
                    page {pagination.page} / {Math.max(pagination.total_pages, 1)} · limit {pagination.limit} · total {pagination.total.toLocaleString()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page <= 1 || isLoading}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      이전
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.total_pages === 0 || pagination.page >= pagination.total_pages || isLoading}
                      className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      다음
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-4">최근 가입</h3>
                  <div className="space-y-3">
                    {recentUsers.length === 0 && <p className="text-gray-500 text-sm">최근 가입 사용자가 없습니다.</p>}
                    {recentUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => void handleUserDetail(user)}
                        className="w-full flex items-center gap-3 p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-left"
                      >
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{user.name}</p>
                          <p className="text-gray-400 text-xs truncate">{user.email}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    활발한 사용자
                  </h3>
                  <div className="space-y-3">
                    {topUsers.length === 0 && <p className="text-gray-500 text-sm">활동 집계가 없습니다.</p>}
                    {topUsers.map((user, index) => (
                      <div key={user.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center justify-center w-6 h-6 bg-primary/20 rounded-full text-primary text-xs font-bold flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{user.name}</p>
                          <p className="text-gray-400 text-xs">{user.upload_count} 업로드</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold text-lg mb-4">사용자 증가</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-400 text-sm">이번 주</span>
                        <span className="text-gray-500 text-sm font-medium">API 준비중</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2">
                        <div className="bg-green-500 h-2 rounded-full" style={{ width: '0%' }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-400 text-sm">이번 달</span>
                        <span className="text-gray-500 text-sm font-medium">API 준비중</span>
                      </div>
                      <div className="w-full bg-white/5 rounded-full h-2">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: '0%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {showUserDetail && detailUser && (
        <div className="fixed inset-0 z-50 flex items-end justify-end">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowUserDetail(false)}
          />
          <div className="relative w-full md:w-[520px] h-full bg-[#111116] border-l border-white/10 overflow-auto">
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
                  <h4 className="text-white font-semibold text-lg">{detailUser.name}</h4>
                  <p className="text-gray-400">{detailUser.email}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {isDetailLoading && (
                <div className="flex items-center gap-2 p-4 bg-white/5 border border-white/10 rounded-xl text-gray-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>상세 정보를 불러오는 중입니다.</span>
                </div>
              )}

              {detailErrorMessage && (
                <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{detailErrorMessage}</span>
                </div>
              )}

              {roleActionSuccess && (
                <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{roleActionSuccess}</span>
                </div>
              )}

              {statusActionSuccess && (
                <div className="flex items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{statusActionSuccess}</span>
                </div>
              )}

              <div>
                <h4 className="text-white font-medium mb-3">기본 정보</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-gray-400 text-sm">역할</span>
                    <span className={`px-2.5 py-1 border rounded-lg text-xs font-medium ${getRoleColor(detailUser.role)}`}>
                      {detailUser.role}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-gray-400 text-sm">상태</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-xs font-medium ${getStatusColor(normalizeUserStatus(detailUser.status))}`}>
                      {getStatusIcon(normalizeUserStatus(detailUser.status))}
                      {getStatusLabel(normalizeUserStatus(detailUser.status))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-gray-400 text-sm">가입일</span>
                    <span className="text-white text-sm">{formatDateTime(detailUser.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-gray-400 text-sm">마지막 활동</span>
                    <span className="text-white text-sm">{formatDateTime(detailUser.last_active_at)}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-gray-400 text-sm">정지 일시</span>
                    <span className="text-white text-sm">{formatDateTime(detailUser.suspended_at)}</span>
                  </div>
                  <div className="flex items-start justify-between gap-4 py-2">
                    <span className="text-gray-400 text-sm">정지 사유</span>
                    <span className="text-white text-sm text-right break-words">{detailUser.suspended_reason || '-'}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-white font-medium mb-3">활동 통계</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                    <p className="text-gray-400 text-sm mb-1">총 업로드</p>
                    <p className="text-white text-2xl font-bold">{detailUser.upload_count}</p>
                  </div>
                  <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                    <p className="text-gray-400 text-sm mb-1">총 문서</p>
                    <p className="text-white text-2xl font-bold">{detailUser.document_count}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-white font-medium mb-3">문서</h4>
                <div className="space-y-2">
                  {!selectedUserDetail?.documents?.length && (
                    <p className="text-gray-500 text-sm p-3 bg-white/5 rounded-lg">표시할 문서가 없습니다.</p>
                  )}
                  {selectedUserDetail?.documents.map((document) => {
                    const status = getDocumentStatusPresentation(document.status);

                    return (
                      <div key={document.id} className="p-3 bg-white/5 border border-white/10 rounded-lg">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate">{document.file_name}</p>
                            <p className="text-gray-500 text-xs flex items-center gap-1 mt-1">
                              <Calendar className="w-3 h-3" />
                              {formatDateTime(document.upload_at)}
                            </p>
                          </div>
                          <span className={`px-2 py-1 border rounded-md text-xs ${status.bgColor} ${status.color} ${status.borderColor}`}>
                            {status.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="text-white font-medium mb-3">최근 작업</h4>
                <div className="space-y-2">
                  {!selectedUserDetail?.recent_tasks?.length && (
                    <p className="text-gray-500 text-sm p-3 bg-white/5 rounded-lg">최근 작업이 없습니다.</p>
                  )}
                  {selectedUserDetail?.recent_tasks.map((task: AdminUserRecentTask) => (
                    <div key={task.id} className="p-3 bg-white/5 border border-white/10 rounded-lg">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-white text-sm font-medium truncate">{task.document.file_name}</p>
                          <p className="text-gray-500 text-xs flex items-center gap-1 mt-1">
                            <Activity className="w-3 h-3" />
                            {task.task_type} · {formatDateTime(task.updated_at)}
                          </p>
                        </div>
                        <span className="px-2 py-1 border rounded-md text-xs bg-white/5 text-gray-300 border-white/10">
                          {getTaskStatusLabel(task.status)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-white font-medium mb-3">액션</h4>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleOpenRoleAction(detailUser)}
                    disabled={isUpdatingRole || !getNextRole(detailUser.role)}
                    className="w-full py-3 px-4 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-lg disabled:opacity-60 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    {isUpdatingRole && roleActionUser?.id === detailUser.id ? '역할 변경 중...' : `역할 변경 · ${getNextRole(detailUser.role) ?? '지원 불가'}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenStatusAction(detailUser)}
                    disabled={isUpdatingStatus}
                    className="w-full py-3 px-4 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20 text-yellow-400 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed font-medium transition-colors"
                  >
                    {isUpdatingStatus && statusActionUser?.id === detailUser.id ? '상태 변경 중...' : `계정 상태 변경 · ${getStatusLabel(getDefaultNextStatus(detailUser.status))}`}
                  </button>
                  <button type="button" disabled className="w-full py-3 px-4 bg-white/5 border border-white/10 text-gray-500 rounded-lg cursor-not-allowed font-medium">
                    비밀번호 재설정 · API 준비중
                  </button>
                  <button type="button" disabled className="w-full py-3 px-4 bg-red-500/10 border border-red-500/20 text-red-400/60 rounded-lg cursor-not-allowed font-medium">
                    계정 삭제 · API 준비중
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {roleActionUser && roleActionNextRole && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isUpdatingRole && setRoleActionUser(null)}
          />
          <div className="relative w-full max-w-md bg-[#111116] border border-white/10 rounded-xl p-6 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">역할 변경 확인</h3>
                <p className="text-gray-400 text-sm mt-1">{getRoleConfirmMessage(roleActionUser, roleActionNextRole)}</p>
              </div>
            </div>

            <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-sm mb-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-gray-400">현재 역할</span>
                <span className={`px-2.5 py-1 border rounded-lg text-xs font-medium ${getRoleColor(roleActionUser.role)}`}>
                  {roleActionUser.role}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 mt-3">
                <span className="text-gray-400">변경 역할</span>
                <span className={`px-2.5 py-1 border rounded-lg text-xs font-medium ${getRoleColor(roleActionNextRole)}`}>
                  {roleActionNextRole}
                </span>
              </div>
            </div>

            {roleActionError && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{roleActionError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRoleActionUser(null)}
                disabled={isUpdatingRole}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmRoleUpdate()}
                disabled={isUpdatingRole}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {isUpdatingRole && <Loader2 className="w-4 h-4 animate-spin" />}
                변경
              </button>
            </div>
          </div>
        </div>
      )}

      {statusActionUser && statusActionCurrentStatus && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => !isUpdatingStatus && setStatusActionUser(null)}
          />
          <div className="relative w-full max-w-md bg-[#111116] border border-white/10 rounded-xl p-6 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <Ban className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-lg">계정 상태 변경 확인</h3>
                <p className="text-gray-400 text-sm mt-1">{getStatusConfirmMessage(statusActionUser, statusActionTarget)}</p>
              </div>
            </div>

            <div className="space-y-4 mb-4">
              <div className="p-3 bg-white/5 border border-white/10 rounded-lg text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-400">현재 상태</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-xs font-medium ${getStatusColor(statusActionCurrentStatus)}`}>
                    {getStatusIcon(statusActionCurrentStatus)}
                    {getStatusLabel(statusActionCurrentStatus)}
                  </span>
                </div>
              </div>

              <label className="block">
                <span className="block text-gray-400 text-sm mb-2">변경 상태</span>
                <select
                  value={statusActionTarget}
                  onChange={(event) => setStatusActionTarget(event.target.value as AdminUserStatus)}
                  disabled={isUpdatingStatus}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
                >
                  {USER_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status} className="bg-[#111116] text-white">
                      {getStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="block text-gray-400 text-sm mb-2">
                  사유 {statusActionTarget === 'SUSPENDED' ? <span className="text-yellow-400">(권장)</span> : <span className="text-gray-500">(선택)</span>}
                </span>
                <textarea
                  value={statusActionReason}
                  onChange={(event) => setStatusActionReason(event.target.value)}
                  disabled={isUpdatingStatus}
                  rows={3}
                  placeholder={statusActionTarget === 'SUSPENDED' ? '정지 사유를 입력해 주세요.' : '상태 변경 사유를 입력할 수 있습니다.'}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-60"
                />
              </label>
            </div>

            {statusActionError && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-300 text-sm mb-4">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{statusActionError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setStatusActionUser(null)}
                disabled={isUpdatingStatus}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleConfirmStatusUpdate()}
                disabled={isUpdatingStatus || statusActionCurrentStatus === statusActionTarget}
                className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-lg disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {isUpdatingStatus && <Loader2 className="w-4 h-4 animate-spin" />}
                변경
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
