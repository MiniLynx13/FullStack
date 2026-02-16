import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'guest'; // опционально, если нужна конкретная роль
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        Загрузка...
      </div>
    );
  }

  // Если требуется конкретная роль, проверяем её
  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  // Для страниц, доступных всем, просто рендерим
  return <>{children}</>;
};