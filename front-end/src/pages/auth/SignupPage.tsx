import { useState } from 'react';
import type { AxiosError } from 'axios';
import { signup } from '../../api/auth';
import {
  FileText,
  Mail,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  Upload,
  Brain,
  Eye,
  MessageSquare,
  CheckCircle2,
  Github
} from 'lucide-react';

interface SignupPageProps {
  onSignup?: () => void;
  onLoginClick?: () => void;
}

export function SignupPage({ onSignup, onLoginClick }: SignupPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentStep] = useState(0); // 0: Account Creation, 1: Email Verify, 2: Ready

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!agreedToTerms) {
      setErrorMessage('약관에 동의해주세요.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);

    try {
      await signup({ name, email, password });
      onSignup?.();
    } catch (error) {
      const axiosError = error as AxiosError<{ detail?: string; message?: string }>;
      setErrorMessage(
        axiosError.response?.data?.detail
          ?? axiosError.response?.data?.message
          ?? '회원가입에 실패했습니다. 입력 정보를 확인해주세요.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    { label: 'Account Creation', icon: User },
    { label: 'Email Verify', icon: Mail },
    { label: 'Ready', icon: CheckCircle2 }
  ];

  const onboardingSteps = [
    { icon: Upload, label: 'Upload', description: '문서 업로드' },
    { icon: Brain, label: 'AI Process', description: '자동 처리' },
    { icon: MessageSquare, label: 'Ask Questions', description: '질의응답' }
  ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0a0a0f] via-[#0f0f1a] to-[#1a1a2e] flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated background gradient orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />

      <div className="relative w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Branding and features */}
        <div className="hidden lg:flex flex-col justify-center space-y-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 backdrop-blur-sm rounded-xl border border-primary/20">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">AI 문서 자동화</h1>
                <p className="text-gray-400">Document Intelligence Platform</p>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-4xl font-bold text-white leading-tight">
                3단계로 시작하는<br />
                AI 문서 자동화
              </h2>
              <p className="text-lg text-gray-400 leading-relaxed">
                OCR, 자동 요약, RAG 기반 질의응답까지.<br />
                지금 바로 시작해보세요.
              </p>
            </div>

            {/* Onboarding Steps */}
            <div className="space-y-3 pt-4">
              <h3 className="text-white font-semibold text-sm mb-4">3 Steps to Get Started</h3>
              {onboardingSteps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 bg-primary/10 backdrop-blur-sm rounded-xl border border-primary/20 flex items-center justify-center">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-primary font-bold text-sm">Step {idx + 1}</span>
                      <ArrowRight className="w-4 h-4 text-gray-600" />
                      <span className="text-white font-medium">{step.label}</span>
                    </div>
                    <p className="text-gray-400 text-sm mt-0.5">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                <Eye className="w-6 h-6 text-blue-400 mb-2" />
                <h3 className="text-white font-medium mb-1">OCR</h3>
                <p className="text-gray-400 text-sm">실시간 텍스트 추출</p>
              </div>
              <div className="p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                <Brain className="w-6 h-6 text-primary mb-2" />
                <h3 className="text-white font-medium mb-1">AI Summary</h3>
                <p className="text-gray-400 text-sm">지능형 문서 요약</p>
              </div>
              <div className="p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                <MessageSquare className="w-6 h-6 text-purple-400 mb-2" />
                <h3 className="text-white font-medium mb-1">RAG Chat</h3>
                <p className="text-gray-400 text-sm">맥락 기반 답변</p>
              </div>
              <div className="p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                <Sparkles className="w-6 h-6 text-yellow-400 mb-2" />
                <h3 className="text-white font-medium mb-1">Automation</h3>
                <p className="text-gray-400 text-sm">문서 자동 처리</p>
              </div>
            </div>
          </div>

          {/* Floating badges */}
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-green-500/10 backdrop-blur-sm rounded-full border border-green-500/20">
              <p className="text-green-400 text-sm font-medium">✓ 무료로 시작</p>
            </div>
            <div className="px-4 py-2 bg-blue-500/10 backdrop-blur-sm rounded-full border border-blue-500/20">
              <p className="text-blue-400 text-sm font-medium">⚡ 즉시 사용 가능</p>
            </div>
          </div>
        </div>

        {/* Right side - Signup form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          {/* Mobile logo - only shown on small screens */}
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary/10 backdrop-blur-sm rounded-xl border border-primary/20">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold text-white">AI 문서 자동화</h1>
                <p className="text-gray-400 text-sm">Document Intelligence Platform</p>
              </div>
            </div>
          </div>

          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              {steps.map((step, idx) => {
                const StepIcon = step.icon;
                const isActive = idx === currentStep;
                const isCompleted = idx < currentStep;
                return (
                  <div key={idx} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          isActive
                            ? 'bg-primary border-2 border-primary'
                            : isCompleted
                            ? 'bg-green-500/20 border-2 border-green-500/50'
                            : 'bg-white/5 border-2 border-white/10'
                        }`}
                      >
                        <StepIcon
                          className={`w-5 h-5 ${
                            isActive
                              ? 'text-white'
                              : isCompleted
                              ? 'text-green-400'
                              : 'text-gray-600'
                          }`}
                        />
                      </div>
                      <span
                        className={`text-xs mt-2 ${
                          isActive || isCompleted ? 'text-white' : 'text-gray-600'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {idx < steps.length - 1 && (
                      <div
                        className={`h-0.5 flex-1 mx-2 ${
                          isCompleted ? 'bg-green-500/50' : 'bg-white/10'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Signup Card */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-500 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity" />
            <div className="relative bg-[#111116]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">계정 만들기</h2>
                <p className="text-gray-400">몇 초면 시작할 수 있어요</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {errorMessage && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {errorMessage}
                  </div>
                )}

                {/* Name input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">이름</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
                      placeholder="홍길동"
                      required
                    />
                  </div>
                </div>

                {/* Email input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">이메일</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
                      placeholder="your@email.com"
                      required
                    />
                  </div>
                </div>

                {/* Password input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">비밀번호</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                {/* Confirm Password input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    비밀번호 확인
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                {/* Terms checkbox */}
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() => setAgreedToTerms(!agreedToTerms)}
                    className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                      agreedToTerms
                        ? 'bg-primary border-primary'
                        : 'bg-white/5 border-white/20 hover:border-white/40'
                    }`}
                  >
                    {agreedToTerms && <CheckCircle2 className="w-3 h-3 text-white" />}
                  </button>
                  <label className="text-sm text-gray-400 leading-relaxed">
                    <button
                      type="button"
                      className="text-primary hover:underline"
                    >
                      이용약관
                    </button>
                    {' '}및{' '}
                    <button
                      type="button"
                      className="text-primary hover:underline"
                    >
                      개인정보 처리방침
                    </button>
                    에 동의합니다
                  </label>
                </div>

                {/* Signup button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    <>
                      계정 만들기
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-[#111116] text-gray-500">또는</span>
                  </div>
                </div>

                {/* Social signup buttons */}
                <div className="space-y-3">
                  <button
                    type="button"
                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-all flex items-center justify-center gap-3"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Google로 계속하기
                  </button>

                  <button
                    type="button"
                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-all flex items-center justify-center gap-3"
                  >
                    <Github className="w-5 h-5" />
                    GitHub로 계속하기
                  </button>
                </div>

                {/* Login link */}
                <div className="text-center pt-4">
                  <p className="text-gray-400 text-sm">
                    이미 계정이 있으신가요?{' '}
                    <button
                      type="button"
                      onClick={onLoginClick}
                      className="text-primary hover:underline font-medium"
                    >
                      로그인하기
                    </button>
                  </p>
                </div>
              </form>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="mt-6 flex items-center justify-center gap-6 text-gray-500 text-xs">
            <div className="flex items-center gap-1.5">
              <Lock className="w-4 h-4" />
              <span>보안 연결</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>무료 시작</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
