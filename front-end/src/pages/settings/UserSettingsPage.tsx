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
  Monitor,
  Save,
  User,
} from 'lucide-react';

import { fetchMe } from '../../api/auth';
import { updateMyPassword, updateMyProfile } from '../../api/user';
import { Sidebar } from '../../components/common/Sidebar';
import { usePersistentSidebar } from '../../hooks/usePersistentSidebar';
import { getAuthUser, type AuthUser } from '../../utils/auth';

interface UserSettingsPageProps {
  onLogout?: () => void;
}

type UserSource = 'api' | 'local' | 'none';

function getErrorMessage(error: unknown, fallbackMessage = '사용자 정보를 불러오지 못했습니다.') {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: unknown; message?: unknown } } }).response;
    const detail = response?.data?.detail;
    const message = response?.data?.message;

    if (typeof detail === 'string') return detail;
    if (typeof message === 'string') return message;
    if (Array.isArray(detail) && detail.length > 0) return '입력값을 확인해 주세요.';

    return fallbackMessage;
  }

  if (error instanceof Error) return error.message;

  return fallbackMessage;
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

function TextInputField({
  label,
  value,
  type = 'text',
  helper,
  autoComplete,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  type?: string;
  helper?: string;
  autoComplete?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm text-zinc-400">{label}</span>
      <input
        type={type}
        value={value}
        autoComplete={autoComplete}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-blue-400/60 focus:bg-white/10 disabled:cursor-not-allowed disabled:opacity-70"
      />
      {helper && <span className="block text-xs text-zinc-500">{helper}</span>}
    </label>
  );
}

export function UserSettingsPage({ onLogout }: UserSettingsPageProps) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = usePersistentSidebar();
  const [user, setUser] = useState<AuthUser | null>(() => getAuthUser());
  const [userSource, setUserSource] = useState<UserSource>(() => (getAuthUser() ? 'local' : 'none'));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileName, setProfileName] = useState(() => getAuthUser()?.name ?? '');
  const [isProfileSaving, setIsProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const nextUser = await fetchMe();
        if (isMounted) {
          setUser(nextUser);
          setProfileName(nextUser.name ?? '');
          setUserSource('api');
        }
      } catch (loadError) {
        if (!isMounted) return;

        const fallbackUser = getAuthUser();
        if (fallbackUser) {
          setUser(fallbackUser);
          setProfileName(fallbackUser.name ?? '');
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

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileMessage(null);
    setProfileError(null);

    const nextName = profileName.trim();
    if (!nextName) {
      setProfileError('이름을 입력해 주세요.');
      return;
    }

    try {
      setIsProfileSaving(true);
      const nextUser = await updateMyProfile({ name: nextName });
      setUser(nextUser);
      setProfileName(nextUser.name ?? '');
      setUserSource('api');
      setProfileMessage('프로필이 저장되었습니다.');
    } catch (saveError) {
      setProfileError(getErrorMessage(saveError, '프로필을 저장하지 못했습니다.'));
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);

    if (newPassword.length < 8) {
      setPasswordError('새 비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('새 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    try {
      setIsPasswordSaving(true);
      const response = await updateMyPassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage(response.message);
    } catch (saveError) {
      setPasswordError(getErrorMessage(saveError, '비밀번호를 변경하지 못했습니다.'));
    } finally {
      setIsPasswordSaving(false);
    }
  };

  const displayName = user?.name?.trim() || user?.email || '사용자';
  const displayEmail = user?.email || '-';
  const displayStatus = user?.status ? getStatusLabel(user.status) : '제공되지 않음';

  return (
    <div className="min-h-screen w-full bg-[#0f0f17] flex">
      <Sidebar
        variant="user"
        sidebarOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((open) => !open)}
        onLogout={onLogout}
        userName={displayName}
        userEmail={displayEmail}
      />

      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        <header className="h-16 bg-[#15151c]/80 backdrop-blur-xl border-b border-white/10 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4">
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
                onSubmit={handleProfileSubmit}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <TextInputField
                    label="이름"
                    value={profileName}
                    autoComplete="name"
                    disabled={isProfileSaving || isLoading}
                    onChange={setProfileName}
                  />
                  <Field label="이메일" value={displayEmail} helper="인증 계정 식별자는 현재 변경할 수 없습니다." />
                  <Field label="역할" value={getRoleLabel(user?.role)} />
                  <Field label="계정 상태" value={displayStatus} />
                </div>
                {profileMessage && (
                  <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-200">
                    <CheckCircle2 className="h-4 w-4" />
                    {profileMessage}
                  </div>
                )}
                {profileError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200">
                    <AlertCircle className="h-4 w-4" />
                    {profileError}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isProfileSaving || isLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-blue-400/30 bg-blue-500/15 px-4 py-2 text-sm text-blue-100 transition-colors hover:bg-blue-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isProfileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  프로필 저장
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
                  <p className="text-sm text-zinc-400">현재 비밀번호 확인 후 새 비밀번호를 저장합니다.</p>
                </div>
              </div>

              <form
                className="grid grid-cols-1 gap-4 md:grid-cols-3"
                onSubmit={handlePasswordSubmit}
              >
                <TextInputField
                  label="현재 비밀번호"
                  type="password"
                  value={currentPassword}
                  autoComplete="current-password"
                  disabled={isPasswordSaving}
                  onChange={setCurrentPassword}
                />
                <TextInputField
                  label="새 비밀번호"
                  type="password"
                  value={newPassword}
                  autoComplete="new-password"
                  helper="8자 이상"
                  disabled={isPasswordSaving}
                  onChange={setNewPassword}
                />
                <TextInputField
                  label="새 비밀번호 확인"
                  type="password"
                  value={confirmPassword}
                  autoComplete="new-password"
                  disabled={isPasswordSaving}
                  onChange={setConfirmPassword}
                />
                {passwordMessage && (
                  <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-200 md:col-span-3">
                    <CheckCircle2 className="h-4 w-4" />
                    {passwordMessage}
                  </div>
                )}
                {passwordError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200 md:col-span-3">
                    <AlertCircle className="h-4 w-4" />
                    {passwordError}
                  </div>
                )}
                <div className="md:col-span-3">
                  <button
                    type="submit"
                    disabled={isPasswordSaving}
                    className="inline-flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-500/15 px-4 py-2 text-sm text-amber-100 transition-colors hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isPasswordSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                    비밀번호 변경
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
