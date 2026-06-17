import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Clipboard,
  Download,
  FileText,
  Loader2,
  MessageSquare,
  Sparkles,
  XCircle,
} from 'lucide-react';
import {
  cancelDocumentSummary,
  confirmDocumentSummary,
  getDocumentMarkdown,
} from '../../api/document';
import { PageTopNav } from '../../components/common/PageTopNav';
import type { DocumentMarkdownResponse } from '../../types/document';
import { normalizeDocumentStatus } from '../../utils/documentStatus';
import { getSafeFromPath } from '../../utils/navigation';

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string; message?: string } } }).response;
    return response?.data?.detail ?? response?.data?.message ?? '요청 처리 중 오류가 발생했습니다.';
  }

  if (error instanceof Error) return error.message;

  return '요청 처리 중 오류가 발생했습니다.';
}

function downloadMarkdown(documentId: string, markdown: string) {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `document-${documentId.slice(0, 8)}-ocr.md`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function DocumentReviewPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { documentId } = useParams();
  const [reviewData, setReviewData] = useState<DocumentMarkdownResponse | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(documentId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(documentId ? null : '문서 ID가 없습니다.');

  const markdown = reviewData?.markdown ?? '';
  const markdownStats = useMemo(() => {
    const lineCount = markdown ? markdown.split('\n').length : 0;
    const charCount = markdown.length;
    const headingCount = markdown.split('\n').filter((line) => line.trim().startsWith('#')).length;

    return { lineCount, charCount, headingCount };
  }, [markdown]);
  const normalizedStatus = reviewData ? normalizeDocumentStatus(reviewData.status) : null;
  const isReviewRequired = normalizedStatus === 'REVIEW_REQUIRED';
  const canOpenSummary = normalizedStatus === 'COMPLETED';
  const canSubmitReview = isReviewRequired && Boolean(markdown);

  useEffect(() => {
    if (!documentId) {
      return;
    }

    const loadMarkdown = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getDocumentMarkdown(documentId);
        setReviewData(data);
      } catch (loadError) {
        setError(getErrorMessage(loadError));
      } finally {
        setIsLoading(false);
      }
    };

    void loadMarkdown();
  }, [documentId]);

  const handleConfirmSummary = async () => {
    if (!documentId || isSubmitting || !canSubmitReview) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await confirmDocumentSummary(documentId);
      navigate(`/documents/${documentId}/status`);
    } catch (confirmError) {
      setError(getErrorMessage(confirmError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelSummary = async () => {
    if (!documentId || isSubmitting || !isReviewRequired) return;

    try {
      setIsSubmitting(true);
      setError(null);
      await cancelDocumentSummary(documentId);
      navigate('/documents?status=REVIEW_REQUIRED');
    } catch (cancelError) {
      setError(getErrorMessage(cancelError));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!markdown) return;

    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const handleBack = () => {
    const summaryPath = documentId ? `/documents/${documentId}/summary` : '/documents';
    const fallback = getSafeFromPath(location, '/documents') === summaryPath ? summaryPath : '/documents';
    navigate(fallback);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      <PageTopNav
        onBack={handleBack}
        title="OCR Markdown 검토"
        description="OCR 결과를 확인한 뒤 요약과 임베딩 작업을 계속 진행할지 선택하세요."
        rightActions={
          <>
            <button
              type="button"
              onClick={() => documentId && navigate(`/documents/${documentId}/summary`)}
              disabled={!canOpenSummary || isSubmitting}
              title={canOpenSummary ? undefined : '요약 완료 후 확인할 수 있습니다.'}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-400/20 bg-blue-500/10 px-4 py-2.5 text-gray-200 transition-colors hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              요약 보기
            </button>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!markdown || isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-200 hover:bg-white/10 disabled:opacity-50 transition-colors"
            >
              <Clipboard className="w-4 h-4" />
              {copied ? '복사됨' : 'Markdown 복사'}
            </button>
            <button
              type="button"
              onClick={() => documentId && downloadMarkdown(documentId, markdown)}
              disabled={!markdown || isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-200 hover:bg-white/10 disabled:opacity-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              다운로드
            </button>
          </>
        }
      />

      <div className="max-w-7xl mx-auto space-y-6 p-6">
        <header className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
            <FileText className="w-7 h-7 text-purple-300" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">OCR Markdown 검토</h1>
            <p className="text-gray-400 mt-1">
              검토 결과와 다음 작업 상태를 확인하세요.
            </p>
          </div>
        </header>

        {isLoading && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-blue-300 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Markdown 결과를 불러오는 중입니다.</span>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-300 flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {reviewData && !isReviewRequired && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-amber-200 flex items-center gap-3">
            <AlertCircle className="w-5 h-5" />
	            <span>현재 문서는 검토 대기 상태가 아니므로 읽기 전용으로 표시됩니다.</span>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
          <section className="bg-[#111116] border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Markdown Preview</h2>
                <p className="text-sm text-gray-500">OCR 팀에서 변환한 Markdown 원문입니다.</p>
              </div>
              <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-medium">
                REVIEW_REQUIRED
              </span>
            </div>

            <div className="max-h-[680px] overflow-auto p-6">
              {markdown ? (
                <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-200 font-mono">
                  {markdown}
                </pre>
              ) : (
                <div className="min-h-[360px] flex flex-col items-center justify-center text-center text-gray-500">
                  <XCircle className="w-10 h-10 mb-3 text-gray-600" />
                  <p className="font-medium text-gray-300">표시할 Markdown 결과가 없습니다.</p>
                  <p className="text-sm mt-1">OCR 작업이 완료되었는지 다시 확인해주세요.</p>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="bg-[#111116] border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-300" />
                검토 정보
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="text-gray-400">상태</span>
                  <span className="text-purple-300 font-medium">{reviewData?.status ?? '-'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="text-gray-400">임베딩 모델</span>
                  <span className="text-white font-medium text-right">{reviewData?.embedding_model ?? '-'}</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="text-gray-400">라인 수</span>
                  <span className="text-white font-medium">{markdownStats.lineCount}</span>
                </div>
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <span className="text-gray-400">제목 수</span>
                  <span className="text-white font-medium">{markdownStats.headingCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">문자 수</span>
                  <span className="text-white font-medium">{markdownStats.charCount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#111116] border border-white/10 rounded-2xl p-6 space-y-4">
              <h3 className="text-lg font-semibold">다음 작업</h3>
              <p className="text-sm text-gray-400 leading-6">
                Markdown 결과가 적절하면 요약을 진행하세요. 보류하면 OCR 결과는 저장되고, 문서 목록에서 나중에 다시 진행할 수 있습니다.
              </p>

              <button
                type="button"
                onClick={handleConfirmSummary}
                disabled={isSubmitting || !canSubmitReview}
                title={isReviewRequired ? undefined : '검토 대기 상태에서만 요약을 진행할 수 있습니다.'}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-primary to-blue-500 text-white rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity font-medium"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                요약 계속 진행
              </button>

              <button
                type="button"
                onClick={handleCancelSummary}
                disabled={isSubmitting || !isReviewRequired}
                title={isReviewRequired ? undefined : '검토 대기 상태에서만 요약을 보류할 수 있습니다.'}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 disabled:opacity-50 transition-colors font-medium"
              >
                <MessageSquare className="w-4 h-4" />
                요약 보류
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
