import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { uploadDocument } from '../../api/document';
import { DocumentUpload } from '../../components/document/DocumentUpload';

import { getEmbeddingModels, type EmbeddingModelOption } from '@/api/document'

function getErrorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { detail?: string; message?: string } } }).response;
    return response?.data?.detail ?? response?.data?.message ?? '문서 업로드에 실패했습니다.';
  }

  if (error instanceof Error) return error.message;

  return '문서 업로드에 실패했습니다.';
}

export function DocumentUploadPage() {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [embeddingModels, setEmbeddingModels] = useState<EmbeddingModelOption[]>([]);
  const [selectedEmbeddingModel, setSelectedEmbeddingModel] = useState('');

  useEffect(() => {
    const loadEmbeddingModels = async () => {
      try {
        const response = await getEmbeddingModels()
        setEmbeddingModels(response.models)
        setSelectedEmbeddingModel(
          response.default_model
        )
      } catch (error) {
        console.error(
          "Failed to load embedding models",
          error
        )
      }
    }
    loadEmbeddingModels()
  }, [])

  const handleUpload = async (file: File) => {
    if (isUploading) return;

    setError(null);
    setIsUploading(true);

    try {
      const result = await uploadDocument(file, selectedEmbeddingModel);
      navigate(`/documents/${result.document_id}/status`);
    } catch (uploadError) {
      setError(getErrorMessage(uploadError));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <button
            type="button"
            onClick={() => navigate('/documents')}
            className="text-sm text-gray-400 hover:text-white transition-colors mb-4"
          >
            ← 문서 목록으로 돌아가기
          </button>
          <h1 className="text-3xl font-bold">문서 업로드</h1>
          <p className="text-gray-400 mt-2">
            PDF 문서를 업로드하면 OCR 작업이 백그라운드에서 시작되고, 처리 상태 화면으로 이동합니다.
          </p>
        </div>


        <div className="bg-[#111116] border border-white/10 rounded-2xl p-6 space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-white">임베딩 모델 선택</h2>
            <p className="text-sm text-gray-400 mt-1">
              OCR Markdown 검수 후 요약/검색용 벡터 생성에 사용할 모델을 선택합니다.
            </p>
          </div>
          <select
          value={selectedEmbeddingModel}
          onChange={(e)=> setSelectedEmbeddingModel(e.target.value)}
          >
          {embeddingModels.map(model => (
            <option
                key={model.value}
                value={model.value}
            >
                {model.label}
            </option>
          ))}
          </select>
        </div>

        <div className="bg-[#111116] border border-white/10 rounded-2xl p-6">
          <DocumentUpload onUpload={handleUpload} />
        </div>

        {isUploading && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-center gap-3 text-blue-300">
            <Loader2 className="w-5 h-5 animate-spin" />
            <div>
              <p className="font-medium">업로드 중입니다.</p>
              <p className="text-sm text-blue-300/80">업로드가 완료되면 처리 상태 화면으로 자동 이동합니다.</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3 text-red-300">
            <AlertCircle className="w-5 h-5" />
            <div>
              <p className="font-medium">업로드 실패</p>
              <p className="text-sm text-red-300/80">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
