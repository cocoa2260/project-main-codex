import { useNavigate } from 'react-router-dom';

export function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#0B1020] text-white flex items-center justify-center p-6">
      <div className="text-center rounded-2xl border border-white/10 bg-white/[0.04] p-10 max-w-md">
        <h1 className="text-5xl font-bold mb-4">404</h1>
        <p className="text-gray-300 mb-6">페이지를 찾을 수 없습니다.</p>
        <button onClick={() => navigate('/dashboard')} className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500">대시보드로 이동</button>
      </div>
    </div>
  );
}
