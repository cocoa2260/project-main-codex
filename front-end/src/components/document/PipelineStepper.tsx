import {
  Brain,
  Check,
  Circle,
  FileText,
  Loader2,
  Upload,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  DocumentProcessingStatus,
  DocumentStatus,
  PipelineStep,
  PipelineStepId,
  PipelineStepState,
  TaskStage,
} from "@/types/document";
import { getPipelineSteps } from "@/utils/documentStatus";

interface PipelineStepperProps {
  status: DocumentProcessingStatus | DocumentStatus | string | null | undefined;
  stage?: TaskStage | string | null;
  progress?: number;
  className?: string;
}

const stageIconMap = {
  upload: Upload,
  extraction: FileText,
  OCR: FileText,
  SUMMARY: Brain,
  EMBEDDING: Sparkles,
  RAG_INDEXING: Search,
} satisfies Record<PipelineStepId, LucideIcon>;

const stateClassNames: Record<
  PipelineStepState,
  { step: string; icon: string; connector: string; label: string }
> = {
  completed: {
    step: "border-green-500/30 bg-green-500/10 text-green-400",
    icon: "text-green-400",
    connector: "bg-green-500/30",
    label: "text-green-300",
  },
  processing: {
    step: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    icon: "text-blue-400",
    connector: "bg-white/10",
    label: "text-blue-300",
  },
  failed: {
    step: "border-red-500/30 bg-red-500/10 text-red-400",
    icon: "text-red-400",
    connector: "bg-white/10",
    label: "text-red-300",
  },
  pending: {
    step: "border-white/10 bg-white/5 text-zinc-400",
    icon: "text-zinc-400",
    connector: "bg-white/10",
    label: "text-zinc-400",
  },
};

function joinClassNames(...classNames: Array<string | false | null | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

function getStateIcon(step: PipelineStep) {
  if (step.state === "completed") return Check;
  if (step.state === "failed") return X;
  if (step.state === "processing") return Loader2;
  return stageIconMap[step.id] ?? Circle;
}

function getStepAriaLabel(step: PipelineStep) {
  const stateLabel: Record<PipelineStepState, string> = {
    completed: "완료",
    processing: "진행 중",
    failed: "실패",
    pending: "대기 중",
  };

  return `${step.label}: ${stateLabel[step.state]}`;
}

export function PipelineStepper({ status, stage, progress, className }: PipelineStepperProps) {
  const steps = getPipelineSteps(status, stage);
  const normalizedProgress = Math.max(0, Math.min(100, progress ?? 0));

  return (
    <ol
      className={joinClassNames("w-full space-y-4", className)}
      aria-label="문서 처리 단계"
    >
      {steps.map((step, index) => {
        const Icon = getStateIcon(step);
        const isLast = index === steps.length - 1;
        const classNames = stateClassNames[step.state];

        return (
          <li key={step.id}>
            <div className="flex items-start gap-4">
              <div
                className={joinClassNames(
                  "flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg border transition-colors",
                  classNames.step
                )}
                aria-label={getStepAriaLabel(step)}
              >
                <Icon
                  className={joinClassNames(
                    "h-5 w-5",
                    classNames.icon,
                    step.state === "processing" && "animate-spin"
                  )}
                />
              </div>

              <div className="min-w-0 flex-1 pt-1">
                <div className="flex items-center justify-between gap-3">
                  <span className={joinClassNames("text-sm font-medium", classNames.label)}>
                    {step.label}
                  </span>
                  {step.state === "processing" && (
                    <span className="flex items-center gap-1.5 text-sm text-blue-400">
                      <Circle className="h-3.5 w-3.5 fill-current animate-pulse" />
                      진행 중
                    </span>
                  )}
                  <span className="text-xs text-zinc-500">
                    {index + 1}/{steps.length}
                  </span>
                </div>

                {step.state === "processing" && progress !== undefined && (
                  <div className="mt-3">
                    <div className="h-1.5 w-full rounded-full bg-white/5">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                        style={{ width: `${normalizedProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {!isLast && (
              <div
                className={joinClassNames("ml-[21px] mt-2 h-6 w-px", classNames.connector)}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
