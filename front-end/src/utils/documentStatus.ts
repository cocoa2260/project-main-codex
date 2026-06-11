import type {
  DocumentStatus,
  DocumentDisplayStatus,
  DocumentProcessingStatus,
  TaskStage,
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

export function normalizeDocumentStatus(
  status?: DocumentProcessingStatus | DocumentStatus | string | null
): DocumentStatus {
  const upperStatus = status?.toUpperCase();

  switch (upperStatus) {
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
    case "OCR":
      return "OCR";
    case "SUMMARY":
      return "SUMMARY";
    case "EMBEDDING":
      return "EMBEDDING";
    case "RAG":
    case "RAG_INDEXING":
      return "RAG_INDEXING";
    default:
      return null;
  }
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
