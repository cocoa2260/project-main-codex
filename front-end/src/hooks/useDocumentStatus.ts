import { useEffect, useMemo, useRef, useState } from 'react';
import { getDocumentStatus, getDocumentStatusWebSocketUrl } from '../api/document';
import type { DocumentStatusResponse } from '../types/document';
import { getCurrentTaskStageLabel, normalizeDocumentStatus } from '../utils/documentStatus';

export interface DocumentActivityLog {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface UseDocumentStatusResult {
  status: DocumentStatusResponse | null;
  activityLog: DocumentActivityLog[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  progress: number;
  normalizedStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REVIEW_REQUIRED';
  currentStageLabel: string;
}

const FINAL_STATUSES = new Set(['COMPLETED', 'SUCCESS', 'FAILED', 'FAILURE', 'REVIEW_REQUIRED']);

function normalizeStatus(status?: string | null): UseDocumentStatusResult['normalizedStatus'] {
  return normalizeDocumentStatus(status);
}

function toActivityType(status?: string | null): DocumentActivityLog['type'] {
  const normalized = normalizeStatus(status);
  if (normalized === 'REVIEW_REQUIRED') return 'success';
  if (normalized === 'COMPLETED') return 'success';
  if (normalized === 'FAILED') return 'error';
  if (normalized === 'PENDING') return 'warning';
  return 'info';
}

function formatNow() {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date());
}

export function useDocumentStatus(documentId?: string): UseDocumentStatusResult {
  const [status, setStatus] = useState<DocumentStatusResponse | null>(null);
  const [activityLog, setActivityLog] = useState<DocumentActivityLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(Boolean(documentId));
  const [error, setError] = useState<string | null>(null);
  const lastMessageRef = useRef<string>('');
  const statusStatusRef = useRef<string | null>(null);

  useEffect(() => {
    statusStatusRef.current = status?.status ?? null;
  }, [status?.status]);

  useEffect(() => {
    if (!documentId) {
      return;
    }

    let isMounted = true;
    let pollingTimer: number | undefined;
    let socket: WebSocket | undefined;

    const appendLog = (nextStatus: DocumentStatusResponse) => {
      const message = nextStatus.message ?? getCurrentTaskStageLabel(nextStatus.stage, nextStatus.status);
      const logKey = `${nextStatus.status}-${nextStatus.stage}-${nextStatus.progress}-${message}`;

      if (lastMessageRef.current === logKey) return;
      lastMessageRef.current = logKey;

      setActivityLog((prev) => [
        {
          id: `${Date.now()}-${nextStatus.progress}`,
          timestamp: formatNow(),
          message,
          type: toActivityType(nextStatus.status),
        },
        ...prev,
      ].slice(0, 20));
    };

    const applyStatus = (nextStatus: DocumentStatusResponse) => {
      if (!isMounted) return;

      setStatus(nextStatus);
      setError(null);
      setIsLoading(false);
      appendLog(nextStatus);
    };

    const startPolling = () => {
      const poll = async () => {
        try {
          const nextStatus = await getDocumentStatus(documentId);
          applyStatus(nextStatus);

          if (FINAL_STATUSES.has(nextStatus.status.toUpperCase())) {
            if (pollingTimer) window.clearInterval(pollingTimer);
          }
        } catch {
          if (!isMounted) return;
          setError('문서 상태를 조회하지 못했습니다.');
          setIsLoading(false);
        }
      };

      void poll();
      pollingTimer = window.setInterval(poll, 3000);
    };

    try {
      socket = new WebSocket(getDocumentStatusWebSocketUrl(documentId));

      socket.onopen = () => {
        if (!isMounted) return;
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const nextStatus = JSON.parse(event.data) as DocumentStatusResponse;
          applyStatus(nextStatus);
        } catch {
          setError('상태 메시지를 해석하지 못했습니다.');
        }
      };

      socket.onerror = () => {
        if (!isMounted) return;
        setIsConnected(false);
        startPolling();
      };

      socket.onclose = () => {
        if (!isMounted) return;
        setIsConnected(false);

        const currentStatus = statusStatusRef.current?.toUpperCase();
        if (!currentStatus || !FINAL_STATUSES.has(currentStatus)) {
          startPolling();
        }
      };
    } catch {
      startPolling();
    }

    return () => {
      isMounted = false;
      if (pollingTimer) window.clearInterval(pollingTimer);
      socket?.close();
    };
  }, [documentId]);

  const normalizedStatus = useMemo(() => normalizeStatus(status?.status), [status?.status]);
  const progress = Math.max(0, Math.min(100, status?.progress ?? 0));
  const currentStageLabel = getCurrentTaskStageLabel(status?.stage, status?.status);

  return {
    status,
    activityLog,
    isConnected,
    isLoading: documentId ? isLoading : false,
    error: documentId ? error : '문서 ID가 없습니다.',
    progress,
    normalizedStatus,
    currentStageLabel,
  };
}
