import {
  AlertCircle,
  Brain,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Loader2,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DocumentProcessingStatus, DocumentStatus, TaskStage } from "@/types/document";
import { getDocumentStatusPresentation } from "@/utils/documentStatus";
import type { DocumentStatusIconName } from "@/utils/documentStatus";

type StatusBadgeSize = "sm" | "md";

interface StatusBadgeProps {
  status: DocumentProcessingStatus | DocumentStatus | string | null | undefined;
  stage?: TaskStage | string | null;
  size?: StatusBadgeSize;
  showIcon?: boolean;
  className?: string;
}

const iconMap = {
  clock: Clock,
  loader: Loader2,
  clipboard: ClipboardCheck,
  check: CheckCircle2,
  alert: AlertCircle,
  brain: Brain,
  sparkles: Sparkles,
} satisfies Record<DocumentStatusIconName, LucideIcon>;

const sizeClassNames: Record<StatusBadgeSize, { badge: string; icon: string }> = {
  sm: {
    badge: "gap-1.5 px-2.5 py-1 text-xs",
    icon: "w-3 h-3",
  },
  md: {
    badge: "gap-2 px-3 py-1.5 text-xs",
    icon: "w-3.5 h-3.5",
  },
};

function joinClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export function StatusBadge({
  status,
  stage,
  size = "md",
  showIcon = true,
  className,
}: StatusBadgeProps) {
  const presentation = getDocumentStatusPresentation(status, stage);
  const Icon = iconMap[presentation.icon];
  const sizeClassName = sizeClassNames[size];

  return (
    <span
      className={joinClassNames(
        "inline-flex items-center border rounded-lg font-medium whitespace-nowrap",
        sizeClassName.badge,
        presentation.bgColor,
        presentation.borderColor,
        presentation.color,
        className
      )}
    >
      {showIcon && (
        <Icon
          className={joinClassNames(
            sizeClassName.icon,
            presentation.animate && "animate-spin"
          )}
        />
      )}
      {presentation.label}
    </span>
  );
}
