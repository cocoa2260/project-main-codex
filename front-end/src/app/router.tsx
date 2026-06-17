import type { ReactNode } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom';

import { LoginPage } from '../pages/auth/LoginPage';
import { SignupPage } from '../pages/auth/SignupPage';
import { DashboardPage } from '../pages/dashboard/DashboardPage';
import { DocumentListPage } from '../pages/documents/DocumentListPage';
import { DocumentStatusPage } from '../pages/documents/DocumentStatusPage';
import { DocumentSummaryPage } from '../pages/documents/DocumentSummaryPage';
import { DocumentChatPage } from '../pages/documents/DocumentChatPage';
import { DocumentUploadPage } from '../pages/documents/DocumentUploadPage';
import { DocumentDetailPage } from '../pages/documents/DocumentDetailPage';
import { DocumentReviewPage } from '../pages/documents/DocumentReviewPage';
import { DocumentWorkspacePage } from '../pages/documents/DocumentWorkspacePage';
import { UserSettingsPage } from '../pages/settings/UserSettingsPage';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage';
import { AdminUserPage } from '../pages/admin/AdminUserPage';
import { AdminDocumentPage } from '../pages/admin/AdminDocumentPage';
import { AdminJobPage } from '../pages/admin/AdminJobPage';
import { AdminSettingsPage } from '../pages/admin/AdminSettingsPage';
import { AdminLogPage } from '../pages/admin/AdminLogPage';
import { ForbiddenPage } from '../pages/error/ForbiddenPage';
import { NotFoundPage } from '../pages/error/NotFoundPage';
import { ProtectedRoute } from '../routes/ProtectedRoute';
import { clearAuth } from '../utils/auth';

function LoginRoute() {
  const navigate = useNavigate();
  return <LoginPage onLogin={() => navigate('/dashboard')} onSignUpClick={() => navigate('/signup')} />;
}

function SignupRoute() {
  const navigate = useNavigate();
  return <SignupPage onSignup={() => navigate('/login')} onLoginClick={() => navigate('/login')} />;
}

function DashboardRoute() {
  const navigate = useNavigate();
  return <DashboardPage onLogout={() => { clearAuth(); navigate('/login'); }} />;
}

function DocumentListRoute() {
  const navigate = useNavigate();
  return (
    <DocumentListPage
      onLogout={() => { clearAuth(); navigate('/login'); }}
      onOpenSummary={(id) => navigate(`/documents/${id}/summary`)}
      onOpenChat={(id) => navigate(`/documents/${id}/chat`)}
    />
  );
}

function DocumentStatusRoute() {
  const navigate = useNavigate();
  const { documentId = 'demo' } = useParams();
  return (
    <DocumentStatusPage
      onLogout={() => { clearAuth(); navigate('/login'); }}
      onOpenSummary={() => navigate(`/documents/${documentId}/summary`)}
      onOpenChat={() => navigate(`/documents/${documentId}/chat`)}
    />
  );
}

function DocumentSummaryRoute() {
  const navigate = useNavigate();
  return (
    <DocumentSummaryPage
      onLogout={() => { clearAuth(); navigate('/login'); }}
    />
  );
}

function DocumentChatRoute() {
  const navigate = useNavigate();
  return <DocumentChatPage onLogout={() => { clearAuth(); navigate('/login'); }} />;
}

function UserRoute({ children }: { children: ReactNode }) {
  return <ProtectedRoute allowedRoles={['USER', 'ADMIN']}>{children}</ProtectedRoute>;
}

function AdminRoute({ children }: { children: ReactNode }) {
  return <ProtectedRoute allowedRoles={['ADMIN']}>{children}</ProtectedRoute>;
}

function AppRoutes() {
  const navigate = useNavigate();
  const logout = () => {
    clearAuth();
    navigate('/login');
  };

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/signup" element={<SignupRoute />} />

      <Route path="/dashboard" element={<UserRoute><DashboardRoute /></UserRoute>} />
      <Route path="/documents" element={<UserRoute><DocumentListRoute /></UserRoute>} />
      <Route path="/documents/upload" element={<UserRoute><DocumentUploadPage /></UserRoute>} />
      <Route path="/documents/:documentId" element={<UserRoute><DocumentDetailPage /></UserRoute>} />
      <Route path="/documents/:documentId/status" element={<UserRoute><DocumentStatusRoute /></UserRoute>} />
      <Route path="/documents/:documentId/review" element={<UserRoute><DocumentReviewPage /></UserRoute>} />
      <Route path="/documents/:documentId/workspace" element={<UserRoute><DocumentWorkspacePage /></UserRoute>} />
      <Route path="/documents/:documentId/summary" element={<UserRoute><DocumentSummaryRoute /></UserRoute>} />
      <Route path="/documents/:documentId/chat" element={<UserRoute><DocumentChatRoute /></UserRoute>} />
      <Route path="/settings" element={<UserRoute><UserSettingsPage onLogout={logout} /></UserRoute>} />

      <Route path="/admin" element={<AdminRoute><AdminDashboardPage onLogout={logout} /></AdminRoute>} />
      <Route path="/admin/users" element={<AdminRoute><AdminUserPage onLogout={logout} /></AdminRoute>} />
      <Route path="/admin/documents" element={<AdminRoute><AdminDocumentPage onLogout={logout} /></AdminRoute>} />
      <Route path="/admin/jobs" element={<AdminRoute><AdminJobPage onLogout={logout} /></AdminRoute>} />
      <Route path="/admin/settings" element={<AdminRoute><AdminSettingsPage onLogout={logout} /></AdminRoute>} />
      <Route path="/admin/logs" element={<AdminRoute><AdminLogPage onLogout={logout} /></AdminRoute>} />

      <Route path="/forbidden" element={<ForbiddenPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
