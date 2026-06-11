import { FileText, Download, Trash2, MessageSquare, Eye } from 'lucide-react';
import { StatusBadge } from '@/components/common/StatusBadge';
import type { DocumentStatus } from '@/types/document';

interface Document {
  id: string;
  name: string;
  uploadDate: string;
  status: DocumentStatus;
  summary?: string;
  pages?: number;
}

interface DocumentCardProps {
  document: Document;
  onView?: () => void;
  onChat?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
}

export function DocumentCard({ document, onView, onChat, onDownload, onDelete }: DocumentCardProps) {
  return (
    <div className="p-4 bg-card border border-border rounded-lg hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <FileText className="w-6 h-6 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-foreground truncate">{document.name}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-muted-foreground">{document.uploadDate}</span>
            {document.pages && (
              <span className="text-muted-foreground">{document.pages}페이지</span>
            )}
          </div>

          <div className="mt-2">
            <StatusBadge status={document.status} />
          </div>

          {document.summary && (
            <p className="text-muted-foreground mt-3 line-clamp-2">
              {document.summary}
            </p>
          )}
        </div>
      </div>

      {document.status === 'COMPLETED' && (
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
          <button
            onClick={onView}
            className="flex items-center gap-2 px-3 py-2 text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
            <span>보기</span>
          </button>
          <button
            onClick={onChat}
            className="flex items-center gap-2 px-3 py-2 text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>질문</span>
          </button>
          <button
            onClick={onDownload}
            className="flex items-center gap-2 px-3 py-2 text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>다운로드</span>
          </button>
          <button
            onClick={onDelete}
            className="flex items-center gap-2 px-3 py-2 ml-auto text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
