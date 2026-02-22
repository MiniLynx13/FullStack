import { useState, useEffect, createContext, useContext, ReactNode, useRef, useCallback } from 'react';
import { 
  loginUser, 
  registerUser, 
  logoutUser, 
  getCurrentUser, 
  isAuthenticated,
  refreshTokens,
  removeTokens,
  User,
  LoginData,
  RegisterData,
} from '../services/apiService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  isAuth: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  clearError: () => void;
  updateUser: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = user?.role === 'admin';
  const isBanned = user?.role === 'banned';
  
  // Используем ref для отслеживания процесса обновления
  const isRefreshing = useRef(false);
  const initialLoadDone = useRef(false);
  const refreshAttempts = useRef(0);

  const clearError = () => {
    console.log('Clearing error');
    setError(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  // Функция для загрузки пользователя
  const loadUser = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    
    try {
      const userData = await getCurrentUser();
      setUser(userData);
      refreshAttempts.current = 0; // Сбрасываем счетчик попыток
      return true;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return false;
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  // Обработчик события неавторизованного доступа
  useEffect(() => {
    const handleUnauthorized = () => {
      console.log('Unauthorized event received');
      setUser(null);
    };

    window.addEventListener('unauthorized', handleUnauthorized);
    
    return () => {
      window.removeEventListener('unauthorized', handleUnauthorized);
    };
  }, []);

  // Инициализация авторизации
  useEffect(() => {
    const initAuth = async () => {
      if (initialLoadDone.current) return;
      
      const authenticated = isAuthenticated();
      console.log('Init auth, authenticated:', authenticated);
      
      if (!authenticated) {
        setLoading(false);
        initialLoadDone.current = true;
        return;
      }

      // Пробуем загрузить пользователя с текущим access токеном
      const success = await loadUser(true);
      
      if (!success) {
        console.log('Failed to load user, attempting token refresh');
        
        if (isRefreshing.current) {
          console.log('Refresh already in progress, skipping');
          return;
        }
        
        isRefreshing.current = true;
        
        try {
          const refreshed = await refreshTokens();
          
          if (refreshed && refreshed.user) {
            console.log('Token refresh successful, setting user');
            setUser(refreshed.user);
          } else {
            console.log('Token refresh failed, removing tokens');
            removeTokens();
            setUser(null);
          }
        } catch (refreshError) {
          console.error('Error refreshing tokens:', refreshError);
          removeTokens();
          setUser(null);
        } finally {
          isRefreshing.current = false;
          setLoading(false);
        }
      }
      
      initialLoadDone.current = true;
    };

    initAuth();
  }, [loadUser]);

  const login = async (loginData: LoginData) => {
    setLoading(true);
    try {
      const authData = await loginUser(loginData);
      setUser(authData.user);
      setError(null);
      refreshAttempts.current = 0; // Сбрасываем счетчик
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка авторизации';
      console.log('Setting auth error in login:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (registerData: RegisterData) => {
    setLoading(true);
    try {
      await registerUser(registerData);
      const authData = await loginUser({
        username: registerData.username,
        password: registerData.password
      });
      setUser(authData.user);
      setError(null);
      refreshAttempts.current = 0; // Сбрасываем счетчик
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка регистрации';
      console.log('Setting auth error in register:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    setError(null);
    try {
      await logoutUser();
      setUser(null);
      refreshAttempts.current = 0; // Сбрасываем счетчик
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка выхода';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    login,
    register,
    logout,
    isAuth: !!user,
    isAdmin,
    isBanned,
    clearError,
    updateUser,
  };

  console.log('AuthProvider state:', { user, loading, error });

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};