import { useNavigate, useParams } from 'react-router-dom';
import { FileText, ArrowLeft, MessageSquare, Sparkles } from 'lucide-react';

export function DocumentDetailPage() {
  const navigate = useNavigate();
  const { documentId = 'demo' } = useParams();

  return (
    <div className="min-h-screen bg-[#0B1020] text-white p-8">
      <button onClick={() => navigate('/documents')} className="mb-6 flex items-center gap-2 text-gray-300 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> 문서 목록으로
      </button>
      <div className="max-w-5xl mx-auto rounded-2xl border border-white/10 bg-white/[0.04] p-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-xl bg-blue-500/15 flex items-center justify-center">
            <FileText className="w-7 h-7 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">문서 상세</h1>
            <p className="text-gray-400">Document ID: {documentId}</p>
          </div>
        </div>
        <p className="text-gray-300 mb-8">이 화면은 문서 메타정보, 처리 결과, 요약, Q&A 진입을 연결하는 상세 허브로 확장 예정입니다.</p>
        <div className="flex gap-3">
          <button onClick={() => navigate(`/documents/${documentId}/summary`)} className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> 요약 보기
          </button>
          <button onClick={() => navigate(`/documents/${documentId}/chat`)} className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> 문서 채팅
          </button>
        </div>
      </div>
    </div>
  );
}
