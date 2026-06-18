import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  LogOut,
  Menu,
  RefreshCw,
  Save,
  X,
} from 'lucide-react';

import { getAdminPrompt, getAdminPrompts, updateAdminPrompt } from '../../api/admin';
import { Sidebar } from '../../components/common/Sidebar';
import { usePersistentSidebar } from '../../hooks/usePersistentSidebar';
import type { AdminPrompt } from '../../types/admin';
import { formatDateTime } from '../../utils/date';

interface AdminPromptPageProps {
  onLogout?: () => void;
}

function getApiErrorMessage(error: unknown): string {
  const response = (error as { response?: { data?: { detail?: string; message?: string } } }).response;
  return response?.data?.detail ?? response?.data?.message ?? (error instanceof Error ? error.message : '프롬프트 요청에 실패했습니다.');
}

export function AdminPromptPage({ onLogout }: AdminPromptPageProps) {
  const [sidebarOpen, setSidebarOpen] = usePersistentSidebar();
  const [prompts, setPrompts] = useState<AdminPrompt[]>([]);
  const [selectedPromptKey, setSelectedPromptKey] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<AdminPrompt | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasChanges = useMemo(() => (
    selectedPrompt !== null && draftContent !== selectedPrompt.content
  ), [draftContent, selectedPrompt]);

  const fetchPromptDetail = useCallback(async (promptKey: string, showLoading = true) => {
    if (showLoading) setIsLoadingDetail(true);
    setErrorMessage(null);

    try {
      const response = await getAdminPrompt(promptKey);
      setSelectedPrompt(response);
      setSelectedPromptKey(response.prompt_key);
      setDraftContent(response.content);
    } catch (error) {
      setSelectedPrompt(null);
      setDraftContent('');
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  const fetchPrompts = useCallback(async (preferredPromptKey?: string | null) => {
    setIsLoadingList(true);
    setErrorMessage(null);

    try {
      const response = await getAdminPrompts();
      setPrompts(response);
      const nextKey = preferredPromptKey ?? response[0]?.prompt_key ?? null;
      if (nextKey) {
        await fetchPromptDetail(nextKey, false);
      }
    } catch (error) {
      setPrompts([]);
      setSelectedPrompt(null);
      setDraftContent('');
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsLoadingList(false);
    }
  }, [fetchPromptDetail]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchPrompts();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchPrompts]);

  const handleSelectPrompt = (promptKey: string) => {
    setSuccessMessage(null);
    void fetchPromptDetail(promptKey);
  };

  const handleRefresh = () => {
    setSuccessMessage(null);
    void fetchPrompts(selectedPromptKey);
  };

  const handleSave = async () => {
    if (!selectedPrompt || isSaving || !hasChanges) return;

    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await updateAdminPrompt(selectedPrompt.prompt_key, draftContent);
      setSelectedPrompt(response);
      setSelectedPromptKey(response.prompt_key);
      setDraftContent(response.content);
      setPrompts((current) => current.map((prompt) => (
        prompt.prompt_key === response.prompt_key ? response : prompt
      )));
      setSuccessMessage('프롬프트가 저장되었습니다.');
      await fetchPromptDetail(response.prompt_key, false);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#0a0a0f]">
      <Sidebar
        variant="admin"
        sidebarOpen={sidebarOpen}
        onToggle={() => setSidebarOpen((open) => !open)}
        onLogout={onLogout}
      />

      <div className="flex min-h-screen flex-1 flex-col lg:ml-0">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-white/5 bg-[#111116]/80 px-6 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg p-2 transition-colors hover:bg-white/5"
              title="사이드바 토글"
            >
              {sidebarOpen ? <X className="h-5 w-5 text-gray-400" /> : <Menu className="h-5 w-5 text-gray-400" />}
            </button>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold text-white">프롬프트 관리</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoadingList || isLoadingDetail || isSaving}
              className="rounded-lg p-2 transition-colors hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
              title="새로고침"
            >
              <RefreshCw className={`h-5 w-5 text-gray-400 ${isLoadingList ? 'animate-spin' : ''}`} />
            </button>
            <button type="button" className="relative rounded-lg p-2 transition-colors hover:bg-white/5" title="알림">
              <Bell className="h-5 w-5 text-gray-400" />
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <LogOut className="h-4 w-4" />
              로그아웃
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto grid max-w-[1800px] grid-cols-1 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="rounded-xl border border-white/10 bg-[#111116] p-4">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold text-white">Prompt 목록</h2>
                <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-gray-400">{prompts.length}</span>
              </div>

              <div className="space-y-2">
                {isLoadingList ? (
                  <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    로딩 중
                  </div>
                ) : prompts.length > 0 ? (
                  prompts.map((prompt) => (
                    <button
                      key={prompt.prompt_key}
                      type="button"
                      onClick={() => handleSelectPrompt(prompt.prompt_key)}
                      className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                        selectedPromptKey === prompt.prompt_key
                          ? 'border-primary/30 bg-primary/10'
                          : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <p className="font-mono text-xs text-primary">{prompt.prompt_key}</p>
                      <p className="mt-1 text-sm font-medium text-white">{prompt.name}</p>
                      <p className="mt-2 line-clamp-2 text-xs text-gray-500">{prompt.description ?? '-'}</p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-gray-500">
                    표시할 프롬프트가 없습니다.
                  </div>
                )}
              </div>
            </aside>

            <section className="min-w-0 rounded-xl border border-white/10 bg-[#111116]">
              <div className="border-b border-white/10 p-5">
                {selectedPrompt ? (
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-primary">{selectedPrompt.prompt_key}</p>
                      <h2 className="mt-1 text-xl font-semibold text-white">{selectedPrompt.name}</h2>
                      <p className="mt-2 max-w-3xl text-sm text-gray-400">{selectedPrompt.description ?? '-'}</p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>수정 시간 {formatDateTime(selectedPrompt.updated_at)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={!hasChanges || isSaving || isLoadingDetail}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-gray-500"
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      저장
                    </button>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-xl font-semibold text-white">프롬프트를 선택하세요</h2>
                    <p className="mt-2 text-sm text-gray-500">목록에서 수정할 Prompt Key를 선택할 수 있습니다.</p>
                  </div>
                )}
              </div>

              <div className="p-5">
                {successMessage && (
                  <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    {successMessage}
                  </div>
                )}

                {errorMessage && (
                  <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    <AlertCircle className="h-4 w-4" />
                    {errorMessage}
                  </div>
                )}

                {isLoadingDetail ? (
                  <div className="flex h-[520px] items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm text-gray-400">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    프롬프트를 불러오는 중
                  </div>
                ) : selectedPrompt ? (
                  <div>
                    <label htmlFor="prompt-content" className="mb-2 block text-sm font-medium text-gray-300">
                      Prompt 내용
                    </label>
                    <textarea
                      id="prompt-content"
                      value={draftContent}
                      onChange={(event) => setDraftContent(event.target.value)}
                      spellCheck={false}
                      className="min-h-[520px] w-full resize-y rounded-lg border border-white/10 bg-[#0a0a0f] px-4 py-4 font-mono text-sm leading-6 text-gray-200 outline-none transition-colors placeholder:text-gray-600 focus:border-primary/50"
                    />
                  </div>
                ) : (
                  <div className="flex h-[520px] items-center justify-center rounded-lg border border-dashed border-white/10 bg-white/5 text-sm text-gray-500">
                    <AlertCircle className="mr-2 h-4 w-4" />
                    선택된 프롬프트가 없습니다.
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
