import type {
  DocumentStatus,
  DocumentDisplayStatus,
} from "@/types/document";

export function toDocumentDisplayStatus(
  status: DocumentStatus
): DocumentDisplayStatus {
  switch (status) {
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

export function getDocumentProgress(status: DocumentStatus): number {
  switch (status) {
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