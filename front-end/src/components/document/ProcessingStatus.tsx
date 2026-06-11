import { CheckCircle2, Clock, AlertCircle, Loader2 } from 'lucide-react';

interface ProcessingStatusProps {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentStep?: string;
}

export function ProcessingStatus({ status, progress, currentStep }: ProcessingStatusProps) {
  const statusConfig = {
    pending: {
      icon: Clock,
      text: '대기 중',
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      animate: false
    },
    processing: {
      icon: Loader2,
      text: '처리 중',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      animate: true
    },
    completed: {
      icon: CheckCircle2,
      text: '완료',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      animate: false
    },
    failed: {
      icon: AlertCircle,
      text: '실패',
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
      animate: false
    }
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="w-full p-6 bg-card border border-border rounded-lg">
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-3 rounded-lg ${config.bgColor}`}>
          <Icon className={`w-6 h-6 ${config.color} ${config.animate ? 'animate-spin' : ''}`} />
        </div>
        <div className="flex-1">
          <h3 className="text-foreground">{config.text}</h3>
          {currentStep && <p className="text-muted-foreground">{currentStep}</p>}
        </div>
        <div className="text-foreground">{progress}%</div>
      </div>

      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            status === 'completed' ? 'bg-green-600' :
            status === 'failed' ? 'bg-destructive' :
            'bg-primary'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {status === 'processing' && (
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
