import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  FileText,
  Loader2,
  Lock,
  Menu,
  Save,
  User,
  X,
} from 'lucide-react';

import { fetchMe } from '../../api/auth';
import { Sidebar } from '../../components/common/Sidebar';
import { getAuthUser, type AuthUser } from '../../utils/auth';

interface UserSettingsPageProps {
  onLogout?: () => void;
}

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string; message?: string } } }).response;
    return response?.data?.detail ?? response?.data?.message ?? '사용자 정보를 불러오지 못했습니다.';
  }

  if (error instanceof Error) return error.message;

  return '사용자 정보를 불러오지 못했습니다.';
}

export function UserSettingsPage({ onLogout }: UserSettingsPageProps) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(() => getAuthUser());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const nextUser = await fetchMe();
        if (isMounted) setUser(nextUser);
      } catch (loadError) {
        if (isMounted) setError(getErrorMessage(loadError));
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#0f0f17] flex">
      <Sidebar
        variant="user"
        sidebarOpen={sidebarOpen}
        onLogout={onLogout}
        userName={user?.name ?? user?.email ?? '사용자'}
        userEmail={user?.email ?? '-'}
      />

      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        <header className="h-16 bg-[#15151c]/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors lg:hidden"
            >
              {sidebarOpen ? <X className="w-5 h-5 text-zinc-300" /> : <Menu className="w-5 h-5 text-zinc-300" />}
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">사용자 설정</h1>
              <p className="text-sm text-zinc-400">계정 정보와 User 기능 준비 상태</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-zinc-300 hover:text-white text-sm"
          >
            로그아웃
          </button>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <div className="mx-auto max-w-5xl space-y-6">
            {isLoading && (
              <div className="flex items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-blue-200">
                <Loader2 className="h-5 w-5 animate-spin" />
                사용자 정보를 불러오는 중입니다.
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-200">
                <AlertCircle className="h-5 w-5" />
                {error}
              </div>
            )}

            <section className="rounded-xl border border-white/10 bg-[#15151c] p-6">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-blue-300/20 bg-blue-500/10">
                    <User className="h-6 w-6 text-blue-300" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">계정 정보</h2>
                    <p className="text-sm text-zinc-400">인증 API에서 조회한 현재 사용자</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-sm text-green-300">
                  <CheckCircle2 className="h-4 w-4" />
                  로그인됨
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm text-zinc-400">이름</span>
                  <input
                    value={user?.name ?? ''}
                    readOnly
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-zinc-400">이메일</span>
                  <input
                    value={user?.email ?? ''}
                    readOnly
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-zinc-400">역할</span>
                  <input
                    value={user?.role ?? ''}
                    readOnly
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm text-zinc-400">사용자 ID</span>
                  <input
                    value={user?.id ?? '-'}
                    readOnly
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"
                  />
                </label>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-[#15151c] p-5">
                <Bell className="mb-4 h-5 w-5 text-blue-300" />
                <h3 className="mb-2 font-semibold text-white">알림 설정</h3>
                <p className="mb-4 text-sm text-zinc-400">사용자 알림 API가 준비되면 저장 기능을 연결합니다.</p>
                <button
                  type="button"
                  disabled
                  title="사용자 알림 저장 API 준비 중"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-500 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  저장 준비 중
                </button>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#15151c] p-5">
                <FileText className="mb-4 h-5 w-5 text-purple-300" />
                <h3 className="mb-2 font-semibold text-white">문서 기본값</h3>
                <p className="mb-4 text-sm text-zinc-400">업로드 기본 카테고리와 모델 기본값은 후속 API에서 관리합니다.</p>
                <button
                  type="button"
                  onClick={() => navigate('/documents/upload')}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/10"
                >
                  업로드로 이동
                </button>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#15151c] p-5">
                <Lock className="mb-4 h-5 w-5 text-amber-300" />
                <h3 className="mb-2 font-semibold text-white">보안</h3>
                <p className="mb-4 text-sm text-zinc-400">비밀번호 변경 API가 아직 없어서 준비 상태로 표시합니다.</p>
                <button
                  type="button"
                  disabled
                  title="비밀번호 변경 API 준비 중"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-500 disabled:cursor-not-allowed"
                >
                  변경 준비 중
                </button>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
