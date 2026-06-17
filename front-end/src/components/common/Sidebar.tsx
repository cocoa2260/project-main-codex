import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  Cpu,
  FileText,
  Home,
  Settings,
  Shield,
  Upload,
  User,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { fetchMe } from '../../api/auth';
import { getAuthUser, type AuthUser } from '../../utils/auth';

interface SidebarMenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  badge?: string;
}

interface SidebarProps {
  variant?: 'user' | 'admin';
  sidebarOpen: boolean;
  onToggle?: () => void;
  onLogout?: () => void;
  userName?: string;
  userEmail?: string;
}

const userMenuItems: SidebarMenuItem[] = [
  { id: 'dashboard', label: '대시보드', icon: Home, path: '/dashboard' },
  { id: 'documents', label: '문서 관리', icon: FileText, path: '/documents' },
  { id: 'settings', label: '설정', icon: Settings, path: '/settings' },
  { id: 'admin', label: '관리자', icon: Shield, path: '/admin', badge: 'Pro' },
];

const adminMenuItems: SidebarMenuItem[] = [
  { id: 'dashboard', label: '개요', icon: Home, path: '/admin' },
  { id: 'users', label: '사용자', icon: Users, path: '/admin/users' },
  { id: 'documents', label: '문서', icon: FileText, path: '/admin/documents' },
  { id: 'jobs', label: '작업', icon: Activity, path: '/admin/jobs' },
  { id: 'logs', label: '로그', icon: Cpu, path: '/admin/logs' },
  { id: 'settings', label: '설정', icon: Settings, path: '/admin/settings' },
];

function isActivePath(pathname: string, item: SidebarMenuItem, variant: 'user' | 'admin') {
  if (variant === 'admin') {
    if (item.path === '/admin') return pathname === '/admin';
    return pathname.startsWith(item.path);
  }

  if (item.path === '/dashboard') return pathname === '/dashboard';
  if (item.path === '/documents') return pathname.startsWith('/documents');
  if (item.path === '/settings') return pathname.startsWith('/settings');
  return pathname === item.path;
}

export function Sidebar({
  variant = 'user',
  sidebarOpen,
  onToggle,
  userName,
  userEmail,
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => getAuthUser());
  const isAdmin = variant === 'admin';
  const displayName = userName ?? authUser?.name ?? '';
  const displayEmail = userEmail ?? authUser?.email ?? '';
  const canSeeAdminMenu = authUser?.role === 'ADMIN';
  const menuItems = useMemo(() => {
    if (isAdmin) return adminMenuItems;

    return userMenuItems.filter((item) => item.id !== 'admin' || canSeeAdminMenu);
  }, [canSeeAdminMenu, isAdmin]);

  useEffect(() => {
    let isMounted = true;

    fetchMe()
      .then((user) => {
        if (isMounted) {
          setAuthUser(user);
        }
      })
      .catch(() => {
        if (isMounted) {
          setAuthUser(getAuthUser());
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <aside
      className={`
        ${sidebarOpen ? 'w-64' : 'w-20'}
        bg-[#15151c] border-r border-white/10 transition-all duration-300 flex flex-col
        fixed lg:relative h-screen z-30
      `}
    >
      {/* Logo */}
      <div className="h-16 flex items-center gap-2 px-4 border-b border-white/10">
        {sidebarOpen ? (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="p-2 bg-blue-500/20 border border-blue-300/30 rounded-lg">
              <FileText className="w-5 h-5 text-blue-200" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-white font-semibold text-sm">
                {isAdmin ? '관리자 콘솔' : 'AI 문서 자동화'}
              </h1>
              <p className="text-zinc-400 text-xs">Platform</p>
            </div>
          </div>
        ) : (
          <div className="p-2 bg-blue-500/20 border border-blue-300/30 rounded-lg mx-auto">
            <FileText className="w-5 h-5 text-blue-200" />
          </div>
        )}
        {onToggle && (
          <button
            type="button"
            onClick={onToggle}
            className="hidden rounded-lg p-2 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white lg:inline-flex"
            aria-label={sidebarOpen ? '사이드바 접기' : '사이드바 펼치기'}
            title={sidebarOpen ? '사이드바 접기' : '사이드바 펼치기'}
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        )}
      </div>

      {!isAdmin && (
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={() => navigate('/documents/upload')}
            className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-blue-500 text-white text-sm font-semibold shadow-lg shadow-primary/25 hover:opacity-95 hover:shadow-primary/35 transition-all"
          >
            <Upload className={`w-4 h-4 text-white ${sidebarOpen ? '' : 'mx-auto'}`} />
            {sidebarOpen && '새 문서 업로드'}
          </button>
        </div>
      )}

      {/* Menu */}
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => {
          const active = isActivePath(location.pathname, item, variant);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.path)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group
                ${active
                  ? 'bg-primary/90 text-white shadow-lg shadow-primary/20'
                  : 'text-zinc-100 hover:bg-white/10 hover:text-white'
                }
              `}
            >
              <item.icon className={`w-5 h-5 shrink-0 text-current ${sidebarOpen ? '' : 'mx-auto'}`} />
              {sidebarOpen && (
                <>
                  <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 bg-white/15 text-white border border-white/20 text-xs rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* User profile */}
      <div className="p-3 border-t border-white/10">
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors"
          title={sidebarOpen ? undefined : displayName || displayEmail || '사용자'}
        >
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-white" />
          </div>
          {sidebarOpen && (
            <div className="flex-1 text-left min-w-0">
              <p className="truncate text-white text-sm font-medium">{displayName || displayEmail || '-'}</p>
              <p className="truncate text-zinc-400 text-xs">{displayEmail || '-'}</p>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
}
