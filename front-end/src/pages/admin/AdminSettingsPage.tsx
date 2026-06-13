import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAdminSettings } from '../../api/admin';
import { Sidebar } from '../../components/common/Sidebar';
import type { AdminSettingItem, AdminSettingsCategory } from '../../types/admin';
import {
  Settings,
  Shield,
  Menu,
  X,
  Bell,
  Save,
  RotateCcw,
  Eye,
  Cpu,
  Lock,
  Brain,
  Sparkles,
  HardDrive,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  User,
  Sliders,
  RefreshCw,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface SettingCategoryNavigationItem {
  id: string;
  label: string;
  icon: typeof Settings;
  badge?: number;
}

interface AdminSettingsPageProps {
  onLogout?: () => void;
}

const categoryIconMap: Record<string, typeof Settings> = {
  ocr: Eye,
  llm: Brain,
  rag: Sparkles,
  embedding: Sparkles,
  worker: Cpu,
  storage: HardDrive,
  security: Lock,
};

const fallbackCategoryLabels: Record<string, string> = {
  ocr: 'OCR 설정',
  llm: 'LLM 설정',
  rag: 'RAG 설정',
  embedding: 'Embedding 설정',
  worker: 'Worker 설정',
  storage: 'Storage 설정',
  security: 'Security 설정',
};

const categoryDescriptions: Record<string, string> = {
  ocr: '문서 텍스트 추출 엔진 설정',
  llm: 'AI 모델 및 추론 파라미터 설정',
  rag: '문서 검색 및 임베딩 파라미터',
  embedding: '벡터 임베딩 모델 및 검색 설정',
  worker: '백그라운드 작업 처리 설정',
  storage: '파일 저장소 및 보관 정책',
  security: '보안 및 접근 제어 설정',
};

function getApiErrorMessage(error: unknown): string {
  const response = (error as { response?: { data?: { detail?: string; message?: string } } }).response;
  return response?.data?.detail ?? response?.data?.message ?? (error instanceof Error ? error.message : '설정을 불러오지 못했습니다.');
}

function getCategoryLabel(category: AdminSettingsCategory): string {
  return fallbackCategoryLabels[category.id] ?? `${category.name} 설정`;
}

function getSettingValue(setting: AdminSettingItem): string {
  if (setting.sensitive) {
    return setting.value ? String(setting.value) : '••••••••';
  }

  if (Array.isArray(setting.value)) {
    return setting.value.length > 0 ? setting.value.join(', ') : '-';
  }

  if (typeof setting.value === 'boolean') {
    return setting.value ? 'Enabled' : 'Disabled';
  }

  if (setting.value === null || setting.value === undefined || setting.value === '') {
    return '-';
  }

  return String(setting.value);
}

function renderSettingControl(setting: AdminSettingItem) {
  const value = getSettingValue(setting);

  if (typeof setting.value === 'boolean') {
    return (
      <button
        type="button"
        disabled
        className={`
          relative h-6 w-12 cursor-not-allowed rounded-full transition-colors opacity-70
          ${setting.value ? 'bg-primary' : 'bg-white/10'}
        `}
        aria-label={`${setting.label}: ${value}`}
      >
        <span
          className={`
            absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform
            ${setting.value ? 'left-6' : 'left-0.5'}
          `}
        />
      </button>
    );
  }

  if (Array.isArray(setting.value)) {
    return (
      <div className="flex flex-wrap gap-2">
        {setting.value.length > 0 ? (
          setting.value.map((item) => (
            <span key={item} className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-xs text-gray-300">
              {item}
            </span>
          ))
        ) : (
          <span className="text-sm text-gray-500">설정값 없음</span>
        )}
      </div>
    );
  }

  return (
    <input
      type={typeof setting.value === 'number' ? 'number' : 'text'}
      value={value}
      disabled
      readOnly
      className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 font-mono text-sm text-gray-300 opacity-80 focus:outline-none"
    />
  );
}

export function AdminSettingsPage({ onLogout }: AdminSettingsPageProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ocr');
  const [categories, setCategories] = useState<AdminSettingsCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const settingCategories = useMemo<SettingCategoryNavigationItem[]>(() => (
    categories.map((category) => ({
      id: category.id,
      label: getCategoryLabel(category),
      icon: categoryIconMap[category.id] ?? Settings,
      badge: category.settings.length,
    }))
  ), [categories]);

  const activeCategoryData = useMemo(() => (
    categories.find((category) => category.id === activeCategory) ?? categories[0] ?? null
  ), [activeCategory, categories]);

  const activeSettings = useMemo(() => (
    categories.flatMap((category) => (
      category.settings.slice(0, 2).map((setting) => ({
        key: `${category.id}-${setting.key}`,
        label: setting.label,
        value: getSettingValue(setting),
        category: category.name,
        sensitive: setting.sensitive,
      }))
    )).slice(0, 6)
  ), [categories]);

  const warnings = [
    { type: 'info' as const, message: '현재 설정 화면은 Admin Settings Read API 기반의 읽기 전용 모드입니다.' },
    { type: 'warning' as const, message: '저장, 초기화, 환경변수 변경, 재시작 액션은 아직 연결되지 않았습니다.' }
  ];

  const fetchSettings = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setErrorMessage(null);

    try {
      const response = await getAdminSettings();
      setCategories(response.categories);
      setActiveCategory((current) => {
        if (response.categories.some((category) => category.id === current)) return current;
        return response.categories[0]?.id ?? current;
      });
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
      setCategories([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchSettings(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchSettings]);

  const handleRefresh = () => {
    void fetchSettings(false);
  };

  const handleSave = () => {
    return undefined;
  };

  const handleReset = () => {
    return undefined;
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

            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              <h1 className="text-white font-semibold text-lg">시스템 설정</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Info className="w-4 h-4 text-blue-400" />
              <span className="text-blue-400 text-sm font-medium">Read-only</span>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
              className="p-2 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60 rounded-lg transition-colors"
              title="새로고침"
            >
              <RefreshCw className={`w-5 h-5 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              className="p-2 hover:bg-white/5 rounded-lg transition-colors relative"
            >
              <Bell className="w-5 h-5 text-gray-400" />
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
          <div className="max-w-[1800px] mx-auto">
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              {/* Settings categories */}
              <div className="xl:col-span-1">
                <div className="bg-[#111116] border border-white/10 rounded-xl p-4 sticky top-6">
                  <h3 className="text-white font-semibold mb-3 px-2">설정 카테고리</h3>
                  <nav className="space-y-1">
                    {isLoading ? (
                      <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        설정 로딩 중
                      </div>
                    ) : settingCategories.length > 0 ? (
                      settingCategories.map((category) => (
                        <button
                          key={category.id}
                          type="button"
                          onClick={() => setActiveCategory(category.id)}
                          className={`
                            w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                            ${activeCategory === category.id
                              ? 'bg-primary/10 text-primary border border-primary/20'
                              : 'text-gray-400 hover:bg-white/5 hover:text-white'
                            }
                          `}
                        >
                          <category.icon className="w-4 h-4" />
                          <span className="flex-1 text-left text-sm font-medium">{category.label}</span>
                          {category.badge !== undefined && (
                            <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-gray-500">{category.badge}</span>
                          )}
                          <ChevronRight className="w-4 h-4 opacity-50" />
                        </button>
                      ))
                    ) : (
                      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-gray-500">
                        표시할 설정 카테고리가 없습니다.
                      </div>
                    )}
                  </nav>

                  <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled
                      title="설정 저장 기능은 준비 중입니다."
                      className="w-full flex cursor-not-allowed items-center justify-center gap-2 px-4 py-2.5 bg-primary/40 rounded-lg transition-colors opacity-60"
                    >
                      <Save className="w-4 h-4 text-white" />
                      <span className="text-white font-medium text-sm">저장 준비 중</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      disabled
                      title="설정 초기화 기능은 준비 중입니다."
                      className="w-full flex cursor-not-allowed items-center justify-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg transition-colors opacity-60"
                    >
                      <RotateCcw className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-400 font-medium text-sm">초기화 준비 중</span>
                    </button>
                    <p className="text-xs leading-relaxed text-gray-500">
                      현재 backend 응답은 editable=false이며, 이 화면은 설정 조회만 지원합니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* Settings content */}
              <div className="xl:col-span-2 space-y-6">
                {isLoading && (
                  <div className="bg-[#111116] border border-white/10 rounded-xl p-8">
                    <div className="flex items-center justify-center gap-3 text-gray-400">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="text-sm">설정 정보를 불러오는 중입니다.</span>
                    </div>
                  </div>
                )}

                {!isLoading && errorMessage && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400" />
                      <div className="min-w-0">
                        <h2 className="text-base font-semibold text-red-300">설정 조회 실패</h2>
                        <p className="mt-1 text-sm text-red-200/80">{errorMessage}</p>
                        <button
                          type="button"
                          onClick={handleRefresh}
                          disabled={isRefreshing}
                          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200 transition-colors hover:bg-red-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                          다시 시도
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {!isLoading && !errorMessage && !activeCategoryData && (
                  <div className="bg-[#111116] border border-white/10 rounded-xl p-8 text-center">
                    <Settings className="mx-auto h-10 w-10 text-gray-600" />
                    <h2 className="mt-3 text-lg font-semibold text-white">설정 항목 없음</h2>
                    <p className="mt-1 text-sm text-gray-500">API에서 반환된 설정 카테고리가 없습니다.</p>
                    <button
                      type="button"
                      onClick={handleRefresh}
                      disabled={isRefreshing}
                      className="mt-5 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-gray-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                      새로고침
                    </button>
                  </div>
                )}

                {!isLoading && !errorMessage && activeCategoryData && (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-white mb-1">{getCategoryLabel(activeCategoryData)}</h2>
                        <p className="text-gray-400 text-sm">
                          {categoryDescriptions[activeCategoryData.id] ?? `${activeCategoryData.name} 설정값을 확인합니다.`}
                        </p>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-sm text-blue-300">
                        <Shield className="h-4 w-4" />
                        읽기 전용
                      </div>
                    </div>

                    <div className="bg-[#111116] border border-white/10 rounded-xl p-6 space-y-6">
                      {activeCategoryData.settings.length > 0 ? (
                        activeCategoryData.settings.map((setting) => (
                          <div key={setting.key} className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <label className="block text-white font-medium text-sm">{setting.label}</label>
                              {setting.sensitive && (
                                <span className="rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 text-xs text-yellow-300">
                                  sensitive
                                </span>
                              )}
                              {!setting.editable && (
                                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-gray-400">
                                  read-only
                                </span>
                              )}
                            </div>

                            {renderSettingControl(setting)}

                            <p className="text-gray-500 text-xs">
                              {setting.sensitive
                                ? '민감 설정은 API 마스킹 값만 표시하며 원본 노출은 지원하지 않습니다.'
                                : 'Backend 설정 조회 API에서 반환된 현재 값입니다.'}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-lg border border-white/10 bg-white/5 p-5 text-center">
                          <p className="text-sm text-gray-400">이 카테고리에 표시할 설정 항목이 없습니다.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Right panel */}
              <div className="xl:col-span-1 space-y-6">
                {/* Active settings summary */}
                <div className="bg-[#111116] border border-white/10 rounded-xl p-6 sticky top-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-primary" />
                    활성 설정
                  </h3>
                  <div className="space-y-3">
                    {isLoading ? (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        요약 로딩 중
                      </div>
                    ) : activeSettings.length > 0 ? (
                      activeSettings.map((setting) => (
                        <div key={setting.key} className="p-3 bg-white/5 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-gray-400 text-xs">{setting.category}</span>
                            <CheckCircle2 className="w-3 h-3 text-green-400" />
                          </div>
                          <p className="text-white text-sm font-medium mb-0.5">{setting.label}</p>
                          <code className={`text-xs font-mono ${setting.sensitive ? 'text-yellow-300' : 'text-primary'}`}>
                            {setting.value}
                          </code>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">표시할 활성 설정이 없습니다.</p>
                    )}
                  </div>
                </div>

                {/* Warnings */}
                {warnings.length > 0 && (
                  <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                      알림
                    </h3>
                    <div className="space-y-3">
                      {warnings.map((warning, idx) => (
                        <div
                          key={idx}
                          className={`p-3 border rounded-lg ${
                            warning.type === 'warning'
                              ? 'bg-yellow-500/10 border-yellow-500/20'
                              : 'bg-blue-500/10 border-blue-500/20'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {warning.type === 'warning' ? (
                              <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                            ) : (
                              <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            )}
                            <p className={`text-sm ${
                              warning.type === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                            }`}>
                              {warning.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Change history */}
                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    변경 이력
                  </h3>
                  <div className="p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-400 text-xs">준비 중</span>
                      <div className="flex items-center gap-1.5">
                        <User className="w-3 h-3 text-gray-500" />
                        <span className="text-gray-400 text-xs">System</span>
                      </div>
                    </div>
                    <p className="text-white text-sm font-medium mb-1">Read-only Settings</p>
                    <code className="text-gray-400 text-xs font-mono">변경 이력 API 연결 전까지 조회 전용으로 표시됩니다.</code>
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
