import type {
  DocumentStatus,
  DocumentDisplayStatus,
  DocumentProcessingStatus,
  PipelineStep,
  PipelineStepId,
  TaskStage,
  DocumentStatusFilters,
} from "@/types/document";

export type DocumentStatusIconName =
  | "clock"
  | "loader"
  | "clipboard"
  | "check"
  | "alert"
  | "brain"
  | "sparkles";

export interface DocumentStatusPresentation {
  label: string;
  icon: DocumentStatusIconName;
  color: string;
  bgColor: string;
  borderColor: string;
  progressColor: string;
  animate: boolean;
}

const DEFAULT_STATUS: DocumentStatus = "PENDING";
const TASK_STAGE_ORDER: TaskStage[] = ["OCR", "SUMMARY", "EMBEDDING", "RAG_INDEXING"];
const PIPELINE_STEP_ORDER: PipelineStepId[] = ["upload", "extraction", "OCR", "SUMMARY", "EMBEDDING", "RAG_INDEXING"];

const pipelineStepLabels: Record<PipelineStepId, string> = {
  upload: "업로드 완료",
  extraction: "텍스트 추출",
  OCR: "OCR 처리",
  SUMMARY: "AI 요약",
  EMBEDDING: "벡터 임베딩",
  RAG_INDEXING: "RAG 준비 완료",
};

export function normalizeDocumentStatus(
  status?: DocumentProcessingStatus | DocumentStatus | string | null
): DocumentStatus {
  const upperStatus = status?.toUpperCase();

  switch (upperStatus) {
    case "ALL":
      return "ALL";
    case "PENDING":
      return "PENDING";
    case "PROCESSING":
      return "PROCESSING";
    case "REVIEW-REQUIRED":
    case "REVIEW_REQUIRED":
      return "REVIEW_REQUIRED";
    case "COMPLETED":
    case "SUCCESS":
      return "COMPLETED";
    case "FAILED":
    case "FAILURE":
      return "FAILED";
    default:
      return DEFAULT_STATUS;
  }
}

export function normalizeTaskStage(stage?: TaskStage | string | null): TaskStage | null {
  const upperStage = stage?.toUpperCase();

  switch (upperStage) {
    case "READY":
    case "PDF_ANALYSIS":
    case "UPLOAD_COMPLETED":
    case "OCR_PENDING":
    case "OCR_PROCESSING":
    case "OCR_COMPLETED":
    case "MARKDOWN_REVIEW":
    case "OCR":
      return "OCR";
    case "SUMMARY_PENDING":
    case "SUMMARY_PROCESSING":
    case "SUMMARY_COMPLETED":
    case "CHUNKING":
    case "SUMMARY":
      return "SUMMARY";
    case "CHUNKING_PROCESSING":
    case "CHUNKING_COMPLETED":
    case "EMBEDDING_PENDING":
    case "EMBEDDING_PROCESSING":
    case "EMBEDDING_COMPLETED":
    case "EMBEDDING":
      return "EMBEDDING";
    case "RAG":
    case "RAG_INDEXING":
    case "RAG_READY":
      return "RAG_INDEXING";
    case "FAILED":
    default:
      return null;
  }
}

export function getTaskStageLabel(stage?: TaskStage | string | null): string {
  const normalizedStage = normalizeTaskStage(stage);
  return normalizedStage ? pipelineStepLabels[normalizedStage] : "문서 처리";
}

export function getCurrentTaskStageLabel(
  stage?: TaskStage | string | null,
  status?: DocumentProcessingStatus | DocumentStatus | string | null
): string {
  const normalizedStatus = normalizeDocumentStatus(status);
  const normalizedStage = normalizeTaskStage(stage);

  if (normalizedStatus === "REVIEW_REQUIRED") return "Markdown 검토 대기 중";
  if (normalizedStatus === "COMPLETED") return "처리 완료";
  if (normalizedStatus === "FAILED") return "처리 실패";
  if (normalizedStatus === "PENDING") return "작업 대기 중";

  switch (normalizedStage) {
    case "OCR":
      return "OCR 처리 중";
    case "SUMMARY":
      return "AI 요약 중";
    case "EMBEDDING":
      return "벡터 임베딩 중";
    case "RAG_INDEXING":
      return "RAG 준비 중";
    default:
      return "문서 처리 중";
  }
}

export function getPipelineStepOrder(): TaskStage[] {
  return [...TASK_STAGE_ORDER];
}

export function getPipelineSteps(
  status: DocumentProcessingStatus | DocumentStatus | string | null | undefined,
  stage?: TaskStage | string | null
): PipelineStep[] {
  const normalizedStatus = normalizeDocumentStatus(status);
  const normalizedStage = normalizeTaskStage(stage);
  const currentStage = normalizedStage ?? "OCR";
  const currentStageIndex = PIPELINE_STEP_ORDER.indexOf(currentStage);

  return PIPELINE_STEP_ORDER.map((stepStage, index) => {
    let state: PipelineStep["state"] = "pending";

    if (stepStage === "upload" || stepStage === "extraction") {
      state = "completed";
    } else if (normalizedStatus === "COMPLETED") {
      state = "completed";
    } else if (normalizedStatus === "REVIEW_REQUIRED") {
      state = stepStage === "OCR" ? "completed" : "pending";
    } else if (normalizedStatus === "FAILED") {
      state = stepStage === currentStage ? "failed" : "pending";
    } else if (normalizedStatus === "PROCESSING") {
      state = index < currentStageIndex ? "completed" : stepStage === currentStage ? "processing" : "pending";
    }

    return {
      id: stepStage,
      label: pipelineStepLabels[stepStage],
      state,
    };
  });
}

export function toDocumentDisplayStatus(
  status: DocumentProcessingStatus | DocumentStatus | string
): DocumentDisplayStatus {
  switch (normalizeDocumentStatus(status)) {
    case "PENDING":
    case "PROCESSING":
      return "processing";

    case "REVIEW_REQUIRED":
      return "review-required";

    case "COMPLETED":
      return "completed";

    case "FAILED":
      return "failed";

    default:
      return "processing";
  }
}

export function getDocumentProgress(
  status: DocumentProcessingStatus | DocumentStatus | string
): number {
  switch (normalizeDocumentStatus(status)) {
    case "PENDING":
      return 0;

    case "PROCESSING":
      return 50;

    case "REVIEW_REQUIRED":
      return 100;

    case "COMPLETED":
      return 100;

    case "FAILED":
      return 0;

    default:
      return 0;
  }
}

export function getDocumentStatusPresentation(
  status: DocumentProcessingStatus | DocumentStatus | string | null | undefined,
  stage?: TaskStage | string | null
): DocumentStatusPresentation {
  const normalizedStatus = normalizeDocumentStatus(status);
  const normalizedStage = normalizeTaskStage(stage);

  if (normalizedStatus === "PENDING") {
    return {
      label: "대기 중",
      icon: "clock",
      color: "text-zinc-400",
      bgColor: "bg-white/5",
      borderColor: "border-white/10",
      progressColor: "bg-primary",
      animate: false,
    };
  }

  if (normalizedStatus === "PROCESSING") {
    switch (normalizedStage) {
      case "SUMMARY":
        return {
          label: "AI 요약 중",
          icon: "brain",
          color: "text-purple-400",
          bgColor: "bg-purple-500/10",
          borderColor: "border-purple-500/20",
          progressColor: "bg-gradient-to-r from-primary to-blue-500",
          animate: true,
        };
      case "EMBEDDING":
      case "RAG_INDEXING":
        return {
          label: "임베딩 중",
          icon: "sparkles",
          color: "text-yellow-400",
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/20",
          progressColor: "bg-gradient-to-r from-primary to-blue-500",
          animate: true,
        };
      case "OCR":
      default:
        return {
          label: "OCR 처리 중",
          icon: "loader",
          color: "text-blue-400",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/20",
          progressColor: "bg-gradient-to-r from-primary to-blue-500",
          animate: true,
        };
    }
  }

  if (normalizedStatus === "REVIEW_REQUIRED") {
    return {
      label: "리뷰 필요",
      icon: "clipboard",
      color: "text-purple-400",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
      progressColor: "bg-gradient-to-r from-primary to-blue-500",
      animate: false,
    };
  }

  if (normalizedStatus === "COMPLETED") {
    return {
      label: "완료",
      icon: "check",
      color: "text-green-400",
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/20",
      progressColor: "bg-green-600",
      animate: false,
    };
  }

  return {
    label: "실패",
    icon: "alert",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    progressColor: "bg-red-500",
    animate: false,
  };
}

export function isDocumentStatusInProgress(
  status: DocumentProcessingStatus | DocumentStatus | string | null | undefined
): boolean {
  const normalizedStatus = normalizeDocumentStatus(status);
  return normalizedStatus === "PENDING" || normalizedStatus === "PROCESSING" || normalizedStatus === "REVIEW_REQUIRED";
}
