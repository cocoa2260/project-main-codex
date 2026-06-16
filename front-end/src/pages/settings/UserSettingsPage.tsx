import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  FileText,
  Globe2,
  Loader2,
  Lock,
  LogOut,
  Menu,
  Monitor,
  Save,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';

import { fetchMe } from '../../api/auth';
import { Sidebar } from '../../components/common/Sidebar';
import { getAuthUser, type AuthUser } from '../../utils/auth';

interface UserSettingsPageProps {
  onLogout?: () => void;
}

type UserSource = 'api' | 'local' | 'none';

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string; message?: string } } }).response;
    return response?.data?.detail ?? response?.data?.message ?? '사용자 정보를 불러오지 못했습니다.';
  }

  if (error instanceof Error) return error.message;

  return '사용자 정보를 불러오지 못했습니다.';
}

function getRoleLabel(role?: string) {
  if (role === 'ADMIN') return '관리자';
  if (role === 'USER') return '일반 사용자';
  return '권한 정보 없음';
}

function getStatusLabel(status?: string) {
  const normalized = status?.toUpperCase();
  if (normalized === 'ACTIVE') return '활성';
  if (normalized === 'SUSPENDED') return '중지됨';
  if (normalized === 'INACTIVE') return '비활성';
  return '상태 정보 없음';
}

function getStatusClassName(status?: string) {
  const normalized = status?.toUpperCase();
  if (normalized === 'ACTIVE') return 'border-green-500/20 bg-green-500/10 text-green-300';
  if (normalized === 'SUSPENDED') return 'border-red-500/20 bg-red-500/10 text-red-300';
  if (normalized === 'INACTIVE') return 'border-yellow-500/20 bg-yellow-500/10 text-yellow-300';
  return 'border-white/10 bg-white/5 text-zinc-300';
}

function Field({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm text-zinc-400">{label}</span>
      <input
        value={value}
        readOnly
        disabled
        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-zinc-200 outline-none disabled:cursor-not-allowed disabled:opacity-80"
      />
      {helper && <span className="block text-xs text-zinc-500">{helper}</span>}
    </label>
  );
}

export function UserSettingsPage({ onLogout }: UserSettingsPageProps) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(() => getAuthUser());
  const [userSource, setUserSource] = useState<UserSource>(() => (getAuthUser() ? 'local' : 'none'));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preparedNotice, setPreparedNotice] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const nextUser = await fetchMe();
        if (isMounted) {
          setUser(nextUser);
          setUserSource('api');
        }
      } catch (loadError) {
        if (!isMounted) return;

        const fallbackUser = getAuthUser();
        if (fallbackUser) {
          setUser(fallbackUser);
          setUserSource('local');
          setError('/api/auth/me 응답을 사용할 수 없어 저장된 로그인 정보로 표시합니다.');
        } else {
          setUser(null);
          setUserSource('none');
          setError(getErrorMessage(loadError));
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    void loadUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const showPreparedNotice = (message: string) => {
    setPreparedNotice(message);
  };

  const handlePreparedSubmit = (event: FormEvent<HTMLFormElement>, message: string) => {
    event.preventDefault();
    showPreparedNotice(message);
  };

  const displayName = user?.name?.trim() || user?.email || '사용자';
  const displayEmail = user?.email || '-';
  const displayStatus = user?.status ? getStatusLabel(user.status) : '제공되지 않음';

  return (
    <div className="min-h-screen w-full bg-[#0f0f17] flex">
      <Sidebar
        variant="user"
        sidebarOpen={sidebarOpen}
        onLogout={onLogout}
        userName={displayName}
        userEmail={displayEmail}
      />

      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        <header className="h-16 bg-[#15151c]/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors lg:hidden"
              aria-label="사이드바 열기"
            >
              {sidebarOpen ? <X className="w-5 h-5 text-zinc-300" /> : <Menu className="w-5 h-5 text-zinc-300" />}
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">사용자 설정</h1>
              <p className="text-sm text-zinc-400">계정 정보, 보안, 환경설정</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-zinc-300 hover:text-white text-sm"
          >
            <LogOut className="h-4 w-4" />
            로그아웃
          </button>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          <div className="mx-auto max-w-5xl space-y-6">
            {isLoading && (
              <div className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4 text-blue-200">
                <Loader2 className="h-5 w-5 animate-spin" />
                사용자 정보를 불러오는 중입니다.
              </div>
            )}

            {error && (
              <div className="flex items-center gap-3 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4 text-yellow-200">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {preparedNotice && (
              <div className="flex items-center gap-3 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4 text-blue-200">
                <ShieldCheck className="h-5 w-5 shrink-0" />
                <span>{preparedNotice}</span>
              </div>
            )}

            <section className="rounded-lg border border-white/10 bg-[#15151c] p-6">
              <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-blue-300/20 bg-blue-500/10">
                    <User className="h-6 w-6 text-blue-300" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">프로필 / 계정 정보</h2>
                    <p className="text-sm text-zinc-400">
                      {userSource === 'api' ? '/api/auth/me 기준 현재 사용자' : '저장된 로그인 정보 기준 현재 사용자'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-1.5 text-sm text-green-300">
                    <CheckCircle2 className="h-4 w-4" />
                    로그인됨
                  </span>
                  <span className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm ${getStatusClassName(user?.status)}`}>
                    {displayStatus}
                  </span>
                </div>
              </div>

              <form
                className="space-y-5"
                onSubmit={(event) => handlePreparedSubmit(event, '프로필 수정 API가 아직 없어 저장하지 않고 준비 상태로 유지합니다.')}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Field label="이름" value={user?.name ?? '제공되지 않음'} helper="프로필 수정 API 준비 전까지 읽기 전용입니다." />
                  <Field label="이메일" value={displayEmail} helper="인증 계정 식별자는 현재 변경할 수 없습니다." />
                  <Field label="역할" value={getRoleLabel(user?.role)} />
                  <Field label="계정 상태" value={displayStatus} helper={user?.status ? undefined : '현재 auth 응답에 status가 포함되지 않았습니다.'} />
                </div>
                <button
                  type="submit"
                  title="프로필 수정 API 준비 중"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <Save className="h-4 w-4" />
                  프로필 저장 준비 중
                </button>
              </form>
            </section>

            <section className="rounded-lg border border-white/10 bg-[#15151c] p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-amber-300/20 bg-amber-500/10">
                  <Lock className="h-5 w-5 text-amber-300" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">보안 / 비밀번호</h2>
                  <p className="text-sm text-zinc-400">비밀번호 변경 API 연결 전 준비 상태</p>
                </div>
              </div>

              <form
                className="grid grid-cols-1 gap-4 md:grid-cols-3"
                onSubmit={(event) => handlePreparedSubmit(event, '비밀번호 변경 API가 아직 없어 요청을 전송하지 않았습니다.')}
              >
                <Field label="현재 비밀번호" value="준비 중" />
                <Field label="새 비밀번호" value="준비 중" />
                <Field label="새 비밀번호 확인" value="준비 중" />
                <div className="md:col-span-3">
                  <button
                    type="submit"
                    title="비밀번호 변경 API 준비 중"
                    className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    <Lock className="h-4 w-4" />
                    비밀번호 변경 준비 중
                  </button>
                </div>
              </form>
            </section>

            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-[#15151c] p-5">
                <Bell className="mb-4 h-5 w-5 text-blue-300" />
                <h3 className="mb-2 font-semibold text-white">알림 설정</h3>
                <p className="mb-4 text-sm text-zinc-400">문서 처리 완료, 실패, 검토 요청 알림은 후속 사용자 설정 API에서 관리합니다.</p>
                <button
                  type="button"
                  disabled
                  title="사용자 알림 저장 API 준비 중"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-400 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  저장 준비 중
                </button>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#15151c] p-5">
                <Monitor className="mb-4 h-5 w-5 text-purple-300" />
                <h3 className="mb-2 font-semibold text-white">테마 설정</h3>
                <p className="mb-4 text-sm text-zinc-400">현재 다크 테마로 고정되어 있으며 사용자별 테마 저장 API는 준비 중입니다.</p>
                <button
                  type="button"
                  disabled
                  title="테마 저장 API 준비 중"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-400 disabled:cursor-not-allowed"
                >
                  다크 테마 고정
                </button>
              </div>
              <div className="rounded-lg border border-white/10 bg-[#15151c] p-5">
                <Globe2 className="mb-4 h-5 w-5 text-emerald-300" />
                <h3 className="mb-2 font-semibold text-white">언어 설정</h3>
                <p className="mb-4 text-sm text-zinc-400">한국어 UI를 유지하고, 언어 선택 저장은 후속 API에서 연결합니다.</p>
                <button
                  type="button"
                  disabled
                  title="언어 설정 API 준비 중"
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-400 disabled:cursor-not-allowed"
                >
                  한국어 고정
                </button>
              </div>
            </section>

            <section className="rounded-lg border border-white/10 bg-[#15151c] p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-blue-300" />
                  <div>
                    <h2 className="text-base font-semibold text-white">문서 작업</h2>
                    <p className="text-sm text-zinc-400">문서 기본값 저장 API는 준비 중이며 업로드 화면은 사용할 수 있습니다.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/documents/upload')}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 transition-colors hover:bg-white/10"
                >
                  업로드로 이동
                </button>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
