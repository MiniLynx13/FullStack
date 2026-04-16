import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import * as apiService from '../services/apiService';

// Тестовый компонент для доступа к контексту
const TestComponent = () => {
  const { user, isAuth, isAdmin, isBanned, loading, error, login, logout, register } = useAuth();
  
  return (
    <div>
      <div data-testid="loading">{loading.toString()}</div>
      <div data-testid="isAuth">{isAuth.toString()}</div>
      <div data-testid="isAdmin">{isAdmin.toString()}</div>
      <div data-testid="isBanned">{isBanned.toString()}</div>
      <div data-testid="username">{user?.username || 'null'}</div>
      <div data-testid="error">{error || 'null'}</div>
      <button data-testid="login-btn" onClick={() => login({ username: 'test', password: 'pass' })}>Login</button>
      <button data-testid="logout-btn" onClick={() => logout()}>Logout</button>
      <button data-testid="register-btn" onClick={() => register({ username: 'new', email: 'test@test.com', password: 'pass' })}>Register</button>
    </div>
  );
};

describe('useAuth', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('initial state is not authenticated', async () => {
    jest.spyOn(apiService, 'isAuthenticated').mockReturnValue(false);
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    
    expect(screen.getByTestId('isAuth')).toHaveTextContent('false');
    expect(screen.getByTestId('username')).toHaveTextContent('null');
  });

  test('login successfully authenticates user', async () => {
    const mockUser = { id: 1, username: 'testuser', email: 'test@test.com', role: 'user', created_at: '2024-01-01' };
    const mockAuthData = { access_token: 'token', refresh_token: 'refresh', token_type: 'bearer', user: mockUser };
    
    jest.spyOn(apiService, 'isAuthenticated').mockReturnValue(false);
    jest.spyOn(apiService, 'loginUser').mockResolvedValue(mockAuthData);
    jest.spyOn(apiService, 'saveTokens').mockImplementation(() => {});
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    
    act(() => {
      screen.getByTestId('login-btn').click();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('isAuth')).toHaveTextContent('true');
    });
    
    expect(screen.getByTestId('username')).toHaveTextContent('testuser');
  });

  test('admin user has isAdmin true', async () => {
    const mockUser = { id: 1, username: 'admin', email: 'admin@test.com', role: 'admin', created_at: '2024-01-01' };
    const mockAuthData = { access_token: 'token', refresh_token: 'refresh', token_type: 'bearer', user: mockUser };
    
    jest.spyOn(apiService, 'isAuthenticated').mockReturnValue(false);
    jest.spyOn(apiService, 'loginUser').mockResolvedValue(mockAuthData);
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    act(() => {
      screen.getByTestId('login-btn').click();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('isAdmin')).toHaveTextContent('true');
    });
  });

  test('banned user has isBanned true', async () => {
    const mockUser = { id: 1, username: 'banned', email: 'banned@test.com', role: 'banned', created_at: '2024-01-01' };
    const mockAuthData = { access_token: 'token', refresh_token: 'refresh', token_type: 'bearer', user: mockUser };
    
    jest.spyOn(apiService, 'isAuthenticated').mockReturnValue(false);
    jest.spyOn(apiService, 'loginUser').mockResolvedValue(mockAuthData);
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    act(() => {
      screen.getByTestId('login-btn').click();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('isBanned')).toHaveTextContent('true');
    });
  });

  test('logout clears authentication', async () => {
    const mockUser = { id: 1, username: 'testuser', email: 'test@test.com', role: 'user', created_at: '2024-01-01' };
    const mockAuthData = { access_token: 'token', refresh_token: 'refresh', token_type: 'bearer', user: mockUser };
    
    jest.spyOn(apiService, 'isAuthenticated').mockReturnValue(false);
    jest.spyOn(apiService, 'loginUser').mockResolvedValue(mockAuthData);
    jest.spyOn(apiService, 'logoutUser').mockResolvedValue();
    jest.spyOn(apiService, 'removeTokens').mockImplementation(() => {});
    
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    
    act(() => {
      screen.getByTestId('login-btn').click();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('isAuth')).toHaveTextContent('true');
    });
    
    act(() => {
      screen.getByTestId('logout-btn').click();
    });
    
    await waitFor(() => {
      expect(screen.getByTestId('isAuth')).toHaveTextContent('false');
    });
    
    expect(screen.getByTestId('username')).toHaveTextContent('null');
  });
});