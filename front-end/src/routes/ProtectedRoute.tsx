import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getAuthUser, isAuthenticated, type UserRole } from '../utils/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles) {
    const user = getAuthUser();

    if (!user || !allowedRoles.includes(user.role)) {
      return <Navigate to="/forbidden" replace />;
    }
  }

  return <>{children}</>;
}
