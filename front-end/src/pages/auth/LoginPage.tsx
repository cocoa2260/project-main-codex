import { useState } from 'react';
import type { AxiosError } from 'axios';
import { login } from '../../api/auth';
import { FileText, Mail, Lock, ArrowRight, Sparkles, Upload, Brain, Zap } from 'lucide-react';

interface LoginPageProps {
  onLogin?: () => void;
  onSignUpClick?: () => void;
}

export function LoginPage({ onLogin, onSignUpClick }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      await login({ email, password });
      onLogin?.();
    } catch (error) {
      const axiosError = error as AxiosError<{ detail?: string; message?: string }>;
      setErrorMessage(
        axiosError.response?.data?.detail
          ?? axiosError.response?.data?.message
          ?? '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.',
      );
    } finally {
      setIsLoading(false);
    }
  };

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
        {/* Left side - Branding and illustration */}
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
                AI로 문서를<br />
                자동으로 처리하세요
              </h2>
              <p className="text-lg text-gray-400 leading-relaxed">
                OCR, 자동 요약, 스마트 분류, RAG 기반 질의응답까지.<br />
                생성형 AI가 문서 업무를 혁신합니다.
              </p>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                <Brain className="w-6 h-6 text-primary mb-2" />
                <h3 className="text-white font-medium mb-1">AI 요약</h3>
                <p className="text-gray-400 text-sm">지능형 문서 요약</p>
              </div>
              <div className="p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                <Upload className="w-6 h-6 text-blue-400 mb-2" />
                <h3 className="text-white font-medium mb-1">빠른 처리</h3>
                <p className="text-gray-400 text-sm">실시간 OCR 분석</p>
              </div>
              <div className="p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                <Sparkles className="w-6 h-6 text-purple-400 mb-2" />
                <h3 className="text-white font-medium mb-1">자동 분류</h3>
                <p className="text-gray-400 text-sm">스마트 카테고리</p>
              </div>
              <div className="p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                <Zap className="w-6 h-6 text-yellow-400 mb-2" />
                <h3 className="text-white font-medium mb-1">RAG 검색</h3>
                <p className="text-gray-400 text-sm">맥락 기반 답변</p>
              </div>
            </div>
          </div>

          {/* Floating stats/badges */}
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-green-500/10 backdrop-blur-sm rounded-full border border-green-500/20">
              <p className="text-green-400 text-sm font-medium">✓ 99.9% 정확도</p>
            </div>
            <div className="px-4 py-2 bg-blue-500/10 backdrop-blur-sm rounded-full border border-blue-500/20">
              <p className="text-blue-400 text-sm font-medium">⚡ 초고속 처리</p>
            </div>
          </div>
        </div>

        {/* Right side - Login form */}
        <div className="w-full max-w-md mx-auto lg:mx-0">
          {/* Mobile logo - only shown on small screens */}
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="p-3 bg-primary/10 backdrop-blur-sm rounded-xl border border-primary/20">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <div className="text-left">
                <h1 className="text-2xl font-bold text-white">AI 문서 자동화</h1>
                <p className="text-gray-400 text-sm">Document Intelligence Platform</p>
              </div>
            </div>
          </div>

          {/* Glassmorphism login card */}
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-blue-500 rounded-2xl opacity-20 blur-lg" />

            {/* Card */}
            <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-8 shadow-2xl">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">로그인</h2>
                <p className="text-gray-400">계정에 로그인하여 시작하세요</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {errorMessage && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {errorMessage}
                  </div>
                )}

                {/* Email input */}
                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                    이메일
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Password input */}
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                    비밀번호
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {/* Forgot password link */}
                <div className="flex items-center justify-end">
                  <button
                    type="button"
                    className="text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    비밀번호를 잊으셨나요?
                  </button>
                </div>

                {/* Login button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-primary to-blue-500 text-white font-medium rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>로그인 중...</span>
                    </>
                  ) : (
                    <>
                      <span>로그인</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-transparent text-gray-400">또는</span>
                  </div>
                </div>

                {/* Sign up button */}
                <button
                  type="button"
                  onClick={onSignUpClick}
                  className="w-full py-3 px-4 bg-white/5 border border-white/10 text-white font-medium rounded-lg hover:bg-white/10 transition-all"
                >
                  새 계정 만들기
                </button>
              </form>

              {/* Additional info */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-center text-sm text-gray-400">
                  로그인하면{' '}
                  <button type="button" className="text-primary hover:underline">
                    이용약관
                  </button>
                  {' '}및{' '}
                  <button type="button" className="text-primary hover:underline">
                    개인정보처리방침
                  </button>
                  에 동의하게 됩니다
                </p>
              </div>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="mt-8 flex items-center justify-center gap-6 text-gray-500 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full" />
              <span>보안 연결</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full" />
              <span>암호화됨</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-gray-500 text-sm">
        <p>© 2024 AI 문서 자동화 플랫폼. All rights reserved.</p>
      </div>
    </div>
  );
}
