import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../../components/common/Sidebar';
import {
  Home,
  FileText,
  Users,
  Activity,
  Settings,
  Shield,
  Menu,
  X,
  Bell,
  Save,
  RotateCcw,
  Eye,
  Database,
  Cpu,
  Lock,
  Zap,
  Brain,
  Sparkles,
  HardDrive,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  User,
  Globe,
  Server,
  Layers,
  Sliders
} from 'lucide-react';

interface SettingCategory {
  id: string;
  label: string;
  icon: typeof Settings;
  badge?: number;
}

interface AdminSettingsPageProps {
  onLogout?: () => void;
}

export function AdminSettingsPage({ onLogout }: AdminSettingsPageProps) {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeCategory, setActiveCategory] = useState('ocr');
  const [hasChanges, setHasChanges] = useState(false);

  // OCR Settings
  const [ocrEngine, setOcrEngine] = useState('tesseract');
  const [ocrDpi, setOcrDpi] = useState('300');
  const [ocrThreshold, setOcrThreshold] = useState(true);
  const [ocrConfidence, setOcrConfidence] = useState('75');

  // LLM Settings
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [llmModel, setLlmModel] = useState('gemma:7b');
  const [temperature, setTemperature] = useState('0.7');
  const [maxTokens, setMaxTokens] = useState('2048');

  // RAG Settings
  const [chunkSize, setChunkSize] = useState('512');
  const [chunkOverlap, setChunkOverlap] = useState('50');
  const [embeddingModel, setEmbeddingModel] = useState('all-MiniLM-L6-v2');
  const [topK, setTopK] = useState('5');

  // Worker Settings
  const [workerCount, setWorkerCount] = useState('4');
  const [concurrency, setConcurrency] = useState('2');
  const [queueLimit, setQueueLimit] = useState('100');
  const [retryLimit, setRetryLimit] = useState('3');

  // Storage Settings
  const [storageBackend, setStorageBackend] = useState('local');
  const [storagePath, setStoragePath] = useState('/var/lib/ai-platform/storage');
  const [maxFileSize, setMaxFileSize] = useState('50');
  const [retentionDays, setRetentionDays] = useState('90');

  // Security Settings
  const [jwtExpiry, setJwtExpiry] = useState('24');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [apiRateLimit, setApiRateLimit] = useState('1000');
  const [corsEnabled, setCorsEnabled] = useState(true);

  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: Home },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'jobs', label: 'Jobs', icon: Activity },
    { id: 'system', label: 'System', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];



  const adminMenuRoutes: Record<string, string> = {
    dashboard: '/admin',
    users: '/admin/users',
    documents: '/admin/documents',
    jobs: '/admin/jobs',
    system: '/admin/logs',
    settings: '/admin/settings',
  };

  const handleMenuClick = (menuId: string) => {
    const route = adminMenuRoutes[menuId];
    if (route) navigate(route);
  };
  const settingCategories: SettingCategory[] = [
    { id: 'ocr', label: 'OCR 설정', icon: Eye },
    { id: 'llm', label: 'LLM 설정', icon: Brain },
    { id: 'rag', label: 'RAG 설정', icon: Sparkles },
    { id: 'worker', label: 'Worker 설정', icon: Cpu },
    { id: 'storage', label: 'Storage 설정', icon: HardDrive },
    { id: 'security', label: 'Security 설정', icon: Lock }
  ];

  const changeHistory = [
    { time: '2시간 전', user: '김철수', setting: 'LLM Model', value: 'gemma:7b → llama2:13b' },
    { time: '5시간 전', user: '이영희', setting: 'Worker Count', value: '3 → 4' },
    { time: '1일 전', user: '박민수', setting: 'OCR DPI', value: '200 → 300' },
    { time: '2일 전', user: '정수진', setting: 'Chunk Size', value: '256 → 512' }
  ];

  const activeSettings = [
    { label: 'OCR Engine', value: ocrEngine, category: 'OCR' },
    { label: 'LLM Model', value: llmModel, category: 'LLM' },
    { label: 'Worker Count', value: workerCount, category: 'Worker' },
    { label: 'Storage Backend', value: storageBackend, category: 'Storage' }
  ];

  const warnings = [
    { type: 'warning' as const, message: 'Worker count 변경 시 재시작 필요' },
    { type: 'info' as const, message: 'LLM temperature 0.7 권장값 사용 중' }
  ];

  const handleSave = () => {
    console.log('Settings saved');
    setHasChanges(false);
  };

  const handleReset = () => {
    if (confirm('모든 설정을 기본값으로 되돌리시겠습니까?')) {
      console.log('Settings reset');
      setHasChanges(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0a0f] flex">
      {/* Sidebar */}
      <Sidebar
        variant="admin"
        sidebarOpen={sidebarOpen}
        onLogout={onLogout}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Top navigation */}
        <header className="h-16 bg-[#111116]/80 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors lg:hidden"
            >
              {sidebarOpen ? <X className="w-5 h-5 text-gray-400" /> : <Menu className="w-5 h-5 text-gray-400" />}
            </button>

            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              <h1 className="text-white font-semibold text-lg">시스템 설정</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                <span className="text-yellow-400 text-sm font-medium">저장되지 않은 변경사항</span>
              </div>
            )}

            <button
              type="button"
              className="p-2 hover:bg-white/5 rounded-lg transition-colors relative"
            >
              <Bell className="w-5 h-5 text-gray-400" />
            </button>

            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white text-sm"
            >
              로그아웃
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-[1800px] mx-auto">
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
              {/* Settings categories */}
              <div className="xl:col-span-1">
                <div className="bg-[#111116] border border-white/10 rounded-xl p-4 sticky top-6">
                  <h3 className="text-white font-semibold mb-3 px-2">설정 카테고리</h3>
                  <nav className="space-y-1">
                    {settingCategories.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setActiveCategory(category.id)}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all
                          ${activeCategory === category.id
                            ? 'bg-primary/10 text-primary border border-primary/20'
                            : 'text-gray-400 hover:bg-white/5 hover:text-white'
                          }
                        `}
                      >
                        <category.icon className="w-4 h-4" />
                        <span className="flex-1 text-left text-sm font-medium">{category.label}</span>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </button>
                    ))}
                  </nav>

                  <div className="mt-6 pt-6 border-t border-white/10 space-y-3">
                    <button
                      type="button"
                      onClick={handleSave}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/90 rounded-lg transition-colors"
                    >
                      <Save className="w-4 h-4 text-white" />
                      <span className="text-white font-medium text-sm">저장</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                    >
                      <RotateCcw className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-400 font-medium text-sm">초기화</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Settings content */}
              <div className="xl:col-span-2 space-y-6">
                {/* OCR Settings */}
                {activeCategory === 'ocr' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1">OCR 설정</h2>
                      <p className="text-gray-400 text-sm">문서 텍스트 추출 엔진 설정</p>
                    </div>

                    <div className="bg-[#111116] border border-white/10 rounded-xl p-6 space-y-6">
                      {/* OCR Engine */}
                      <div>
                        <label className="block text-white font-medium mb-2 text-sm">OCR Engine</label>
                        <select
                          value={ocrEngine}
                          onChange={(e) => { setOcrEngine(e.target.value); setHasChanges(true); }}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                        >
                          <option value="tesseract">Tesseract OCR</option>
                          <option value="easyocr">EasyOCR</option>
                          <option value="paddleocr">PaddleOCR</option>
                          <option value="google-vision">Google Cloud Vision</option>
                        </select>
                        <p className="text-gray-500 text-xs mt-1">사용할 OCR 엔진을 선택하세요</p>
                      </div>

                      {/* DPI */}
                      <div>
                        <label className="block text-white font-medium mb-2 text-sm">DPI 설정</label>
                        <input
                          type="number"
                          value={ocrDpi}
                          onChange={(e) => { setOcrDpi(e.target.value); setHasChanges(true); }}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                          placeholder="300"
                        />
                        <p className="text-gray-500 text-xs mt-1">스캔 해상도 (권장: 300)</p>
                      </div>

                      {/* Threshold */}
                      <div>
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="block text-white font-medium mb-1 text-sm">Adaptive Threshold</label>
                            <p className="text-gray-500 text-xs">이미지 전처리 시 적응형 임계값 적용</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setOcrThreshold(!ocrThreshold); setHasChanges(true); }}
                            className={`
                              relative w-12 h-6 rounded-full transition-colors
                              ${ocrThreshold ? 'bg-primary' : 'bg-white/10'}
                            `}
                          >
                            <div
                              className={`
                                absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform
                                ${ocrThreshold ? 'left-6' : 'left-0.5'}
                              `}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Confidence */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-white font-medium text-sm">Confidence Threshold</label>
                          <span className="text-primary font-medium text-sm">{ocrConfidence}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={ocrConfidence}
                          onChange={(e) => { setOcrConfidence(e.target.value); setHasChanges(true); }}
                          className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                        />
                        <p className="text-gray-500 text-xs mt-1">최소 신뢰도 기준 (낮을수록 더 많은 텍스트 추출)</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* LLM Settings */}
                {activeCategory === 'llm' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1">LLM 설정</h2>
                      <p className="text-gray-400 text-sm">AI 모델 및 추론 파라미터 설정</p>
                    </div>

                    <div className="bg-[#111116] border border-white/10 rounded-xl p-6 space-y-6">
                      {/* Ollama URL */}
                      <div>
                        <label className="block text-white font-medium mb-2 text-sm">Ollama URL</label>
                        <input
                          type="text"
                          value={ollamaUrl}
                          onChange={(e) => { setOllamaUrl(e.target.value); setHasChanges(true); }}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent font-mono"
                          placeholder="http://localhost:11434"
                        />
                        <p className="text-gray-500 text-xs mt-1">Ollama 서버 주소</p>
                      </div>

                      {/* Model */}
                      <div>
                        <label className="block text-white font-medium mb-2 text-sm">LLM Model</label>
                        <select
                          value={llmModel}
                          onChange={(e) => { setLlmModel(e.target.value); setHasChanges(true); }}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                        >
                          <option value="gemma:7b">Gemma 7B</option>
                          <option value="llama2:13b">Llama 2 13B</option>
                          <option value="mistral:7b">Mistral 7B</option>
                          <option value="mixtral:8x7b">Mixtral 8x7B</option>
                          <option value="qwen:14b">Qwen 14B</option>
                        </select>
                        <p className="text-gray-500 text-xs mt-1">요약 및 분석에 사용할 모델</p>
                      </div>

                      {/* Temperature */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-white font-medium text-sm">Temperature</label>
                          <span className="text-primary font-medium text-sm">{temperature}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="2"
                          step="0.1"
                          value={temperature}
                          onChange={(e) => { setTemperature(e.target.value); setHasChanges(true); }}
                          className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                        />
                        <p className="text-gray-500 text-xs mt-1">창의성 조절 (0.0 = 결정적, 2.0 = 창의적)</p>
                      </div>

                      {/* Max Tokens */}
                      <div>
                        <label className="block text-white font-medium mb-2 text-sm">Max Tokens</label>
                        <input
                          type="number"
                          value={maxTokens}
                          onChange={(e) => { setMaxTokens(e.target.value); setHasChanges(true); }}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                          placeholder="2048"
                        />
                        <p className="text-gray-500 text-xs mt-1">최대 응답 길이</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* RAG Settings */}
                {activeCategory === 'rag' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1">RAG 설정</h2>
                      <p className="text-gray-400 text-sm">문서 검색 및 임베딩 파라미터</p>
                    </div>

                    <div className="bg-[#111116] border border-white/10 rounded-xl p-6 space-y-6">
                      {/* Chunk Size */}
                      <div>
                        <label className="block text-white font-medium mb-2 text-sm">Chunk Size</label>
                        <input
                          type="number"
                          value={chunkSize}
                          onChange={(e) => { setChunkSize(e.target.value); setHasChanges(true); }}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                          placeholder="512"
                        />
                        <p className="text-gray-500 text-xs mt-1">텍스트 청크 크기 (토큰 단위)</p>
                      </div>

                      {/* Chunk Overlap */}
                      <div>
                        <label className="block text-white font-medium mb-2 text-sm">Chunk Overlap</label>
                        <input
                          type="number"
                          value={chunkOverlap}
                          onChange={(e) => { setChunkOverlap(e.target.value); setHasChanges(true); }}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                          placeholder="50"
                        />
                        <p className="text-gray-500 text-xs mt-1">청크 간 중복 토큰 수</p>
                      </div>

                      {/* Embedding Model */}
                      <div>
                        <label className="block text-white font-medium mb-2 text-sm">Embedding Model</label>
                        <select
                          value={embeddingModel}
                          onChange={(e) => { setEmbeddingModel(e.target.value); setHasChanges(true); }}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                        >
                          <option value="all-MiniLM-L6-v2">all-MiniLM-L6-v2</option>
                          <option value="all-mpnet-base-v2">all-mpnet-base-v2</option>
                          <option value="multilingual-e5-base">multilingual-e5-base</option>
                          <option value="bge-base-en-v1.5">bge-base-en-v1.5</option>
                        </select>
                        <p className="text-gray-500 text-xs mt-1">벡터 임베딩 모델</p>
                      </div>

                      {/* Top-K */}
                      <div>
                        <label className="block text-white font-medium mb-2 text-sm">Top-K 검색 결과</label>
                        <input
                          type="number"
                          value={topK}
                          onChange={(e) => { setTopK(e.target.value); setHasChanges(true); }}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                          placeholder="5"
                        />
                        <p className="text-gray-500 text-xs mt-1">검색 시 반환할 최대 청크 수</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Worker Settings */}
                {activeCategory === 'worker' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1">Worker 설정</h2>
                      <p className="text-gray-400 text-sm">백그라운드 작업 처리 설정</p>
                    </div>

                    <div className="bg-[#111116] border border-white/10 rounded-xl p-6 space-y-6">
                      {/* Worker Count */}
                      <div>
                        <label className="block text-white font-medium mb-2 text-sm">Worker 개수</label>
                        <input
                          type="number"
                          value={workerCount}
                          onChange={(e) => { setWorkerCount(e.target.value); setHasChanges(true); }}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                          placeholder="4"
                        />
                        <p className="text-gray-500 text-xs mt-1">동시 실행 Worker 프로세스 수 (재시작 필요)</p>
                      </div>

                      {/* Concurrency */}
                      <div>
                        <label className="block text-white font-medium mb-2 text-sm">Concurrency</label>
                        <input
                          type="number"
                          value={concurrency}
                          onChange={(e) => { setConcurrency(e.target.value); setHasChanges(true); }}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                          placeholder="2"
                        />
                        <p className="text-gray-500 text-xs mt-1">Worker당 동시 작업 수</p>
                      </div>

                      {/* Queue Limit */}
                      <div>
                        <label className="block text-white font-medium mb-2 text-sm">Queue 제한</label>
                        <input
                          type="number"
                          value={queueLimit}
                          onChange={(e) => { setQueueLimit(e.target.value); setHasChanges(true); }}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                          placeholder="100"
                        />
                        <p className="text-gray-500 text-xs mt-1">큐당 최대 대기 작업 수</p>
                      </div>

                      {/* Retry Limit */}
                      <div>
                        <label className="block text-white font-medium mb-2 text-sm">재시도 횟수</label>
                        <input
                          type="number"
                          value={retryLimit}
                          onChange={(e) => { setRetryLimit(e.target.value); setHasChanges(true); }}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                          placeholder="3"
                        />
                        <p className="text-gray-500 text-xs mt-1">작업 실패 시 최대 재시도 횟수</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Storage Settings */}
                {activeCategory === 'storage' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1">Storage 설정</h2>
                      <p className="text-gray-400 text-sm">파일 저장소 및 보관 정책</p>
                    </div>

                    <div className="bg-[#111116] border border-white/10 rounded-xl p-6 space-y-6">
                      {/* Storage Backend */}
                      <div>
                        <label className="block text-white font-medium mb-2 text-sm">Storage Backend</label>
                        <select
                          value={storageBackend}
                          onChange={(e) => { setStorageBackend(e.target.value); setHasChanges(true); }}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                        >
                          <option value="local">Local Filesystem</option>
                          <option value="s3">Amazon S3</option>
                          <option value="gcs">Google Cloud Storage</option>
                          <option value="azure">Azure Blob Storage</option>
                        </select>
                        <p className="text-gray-500 text-xs mt-1">파일 저장 백엔드</p>
                      </div>

                      {/* Storage Path */}
                      <div>
                        <label className="block text-white font-medium mb-2 text-sm">Storage Path</label>
                        <input
                          type="text"
                          value={storagePath}
                          onChange={(e) => { setStoragePath(e.target.value); setHasChanges(true); }}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent font-mono"
                          placeholder="/var/lib/ai-platform/storage"
                        />
                        <p className="text-gray-500 text-xs mt-1">로컬 저장소 경로 또는 버킷 이름</p>
                      </div>

                      {/* Max File Size */}
                      <div>
                        <label className="block text-white font-medium mb-2 text-sm">최대 파일 크기 (MB)</label>
                        <input
                          type="number"
                          value={maxFileSize}
                          onChange={(e) => { setMaxFileSize(e.target.value); setHasChanges(true); }}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                          placeholder="50"
                        />
                        <p className="text-gray-500 text-xs mt-1">업로드 가능한 최대 파일 크기</p>
                      </div>

                      {/* Retention Days */}
                      <div>
                        <label className="block text-white font-medium mb-2 text-sm">보관 기간 (일)</label>
                        <input
                          type="number"
                          value={retentionDays}
                          onChange={(e) => { setRetentionDays(e.target.value); setHasChanges(true); }}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                          placeholder="90"
                        />
                        <p className="text-gray-500 text-xs mt-1">문서 자동 삭제 기간 (0 = 무제한)</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Security Settings */}
                {activeCategory === 'security' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl font-bold text-white mb-1">Security 설정</h2>
                      <p className="text-gray-400 text-sm">보안 및 접근 제어 설정</p>
                    </div>

                    <div className="bg-[#111116] border border-white/10 rounded-xl p-6 space-y-6">
                      {/* JWT Expiry */}
                      <div>
                        <label className="block text-white font-medium mb-2 text-sm">JWT 만료 시간 (시간)</label>
                        <input
                          type="number"
                          value={jwtExpiry}
                          onChange={(e) => { setJwtExpiry(e.target.value); setHasChanges(true); }}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                          placeholder="24"
                        />
                        <p className="text-gray-500 text-xs mt-1">인증 토큰 유효 시간</p>
                      </div>

                      {/* MFA */}
                      <div>
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="block text-white font-medium mb-1 text-sm">2단계 인증 (MFA)</label>
                            <p className="text-gray-500 text-xs">모든 관리자 계정에 MFA 강제 적용</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setMfaEnabled(!mfaEnabled); setHasChanges(true); }}
                            className={`
                              relative w-12 h-6 rounded-full transition-colors
                              ${mfaEnabled ? 'bg-primary' : 'bg-white/10'}
                            `}
                          >
                            <div
                              className={`
                                absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform
                                ${mfaEnabled ? 'left-6' : 'left-0.5'}
                              `}
                            />
                          </button>
                        </div>
                      </div>

                      {/* API Rate Limit */}
                      <div>
                        <label className="block text-white font-medium mb-2 text-sm">API Rate Limit (req/hour)</label>
                        <input
                          type="number"
                          value={apiRateLimit}
                          onChange={(e) => { setApiRateLimit(e.target.value); setHasChanges(true); }}
                          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent"
                          placeholder="1000"
                        />
                        <p className="text-gray-500 text-xs mt-1">사용자당 시간당 API 요청 제한</p>
                      </div>

                      {/* CORS */}
                      <div>
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="block text-white font-medium mb-1 text-sm">CORS 활성화</label>
                            <p className="text-gray-500 text-xs">Cross-Origin Resource Sharing 허용</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setCorsEnabled(!corsEnabled); setHasChanges(true); }}
                            className={`
                              relative w-12 h-6 rounded-full transition-colors
                              ${corsEnabled ? 'bg-primary' : 'bg-white/10'}
                            `}
                          >
                            <div
                              className={`
                                absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform
                                ${corsEnabled ? 'left-6' : 'left-0.5'}
                              `}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right panel */}
              <div className="xl:col-span-1 space-y-6">
                {/* Active settings summary */}
                <div className="bg-[#111116] border border-white/10 rounded-xl p-6 sticky top-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-primary" />
                    활성 설정
                  </h3>
                  <div className="space-y-3">
                    {activeSettings.map((setting, idx) => (
                      <div key={idx} className="p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-400 text-xs">{setting.category}</span>
                          <CheckCircle2 className="w-3 h-3 text-green-400" />
                        </div>
                        <p className="text-white text-sm font-medium mb-0.5">{setting.label}</p>
                        <code className="text-primary text-xs font-mono">{setting.value}</code>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Warnings */}
                {warnings.length > 0 && (
                  <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-400" />
                      알림
                    </h3>
                    <div className="space-y-3">
                      {warnings.map((warning, idx) => (
                        <div
                          key={idx}
                          className={`p-3 border rounded-lg ${
                            warning.type === 'warning'
                              ? 'bg-yellow-500/10 border-yellow-500/20'
                              : 'bg-blue-500/10 border-blue-500/20'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {warning.type === 'warning' ? (
                              <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                            ) : (
                              <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                            )}
                            <p className={`text-sm ${
                              warning.type === 'warning' ? 'text-yellow-400' : 'text-blue-400'
                            }`}>
                              {warning.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Change history */}
                <div className="bg-[#111116] border border-white/10 rounded-xl p-6">
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    변경 이력
                  </h3>
                  <div className="space-y-3">
                    {changeHistory.map((change, idx) => (
                      <div key={idx} className="p-3 bg-white/5 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-xs">{change.time}</span>
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-gray-500" />
                            <span className="text-gray-400 text-xs">{change.user}</span>
                          </div>
                        </div>
                        <p className="text-white text-sm font-medium mb-1">{change.setting}</p>
                        <code className="text-gray-400 text-xs font-mono">{change.value}</code>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
