import { StatusBadge } from '@/components/common/StatusBadge';
import type { DocumentProcessingStatus, DocumentStatus } from '@/types/document';
import { getDocumentStatusPresentation, normalizeDocumentStatus } from '@/utils/documentStatus';

interface ProcessingStatusProps {
  status: DocumentProcessingStatus | DocumentStatus | string;
  progress: number;
  currentStep?: string;
}

export function ProcessingStatus({ status, progress, currentStep }: ProcessingStatusProps) {
  const normalizedStatus = normalizeDocumentStatus(status);
  const presentation = getDocumentStatusPresentation(status);

  return (
    <div className="w-full p-6 bg-card border border-border rounded-lg">
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1">
          <StatusBadge status={status} />
          {currentStep && <p className="text-muted-foreground">{currentStep}</p>}
        </div>
        <div className="text-foreground">{progress}%</div>
      </div>

      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${presentation.progressColor}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {normalizedStatus === 'PROCESSING' && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
            <span>PDF 텍스트 추출</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span>OCR 처리</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-2 h-2 bg-muted-foreground rounded-full" />
            <span>AI 요약 생성</span>
          </div>
        </div>
      )}
    </div>
  );
}
