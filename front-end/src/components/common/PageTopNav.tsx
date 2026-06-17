import type { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageTopNavProps {
  title?: string;
  description?: string;
  backLabel?: string;
  onBack?: () => void;
  backTo?: string;
  rightActions?: ReactNode;
}

export function PageTopNav({
  title,
  description,
  backLabel = '돌아가기',
  onBack,
  backTo,
  rightActions,
}: PageTopNavProps) {
  const navigate = useNavigate();
  const showBack = Boolean(onBack || backTo);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }

    if (backTo) navigate(backTo);
  };

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#15151c]/90 backdrop-blur-xl">
      <div className="flex min-h-16 items-center justify-between gap-4 px-5 py-3 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {showBack && (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </button>
          )}

          {(title || description) && (
            <>
              {showBack && <div className="hidden h-5 w-px bg-white/10 sm:block" />}
              <div className="min-w-0">
                {title && <h1 className="truncate text-base font-semibold text-white">{title}</h1>}
                {description && <p className="truncate text-sm text-zinc-400">{description}</p>}
              </div>
            </>
          )}
        </div>

        {rightActions && <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">{rightActions}</div>}
      </div>
    </header>
  );
}
