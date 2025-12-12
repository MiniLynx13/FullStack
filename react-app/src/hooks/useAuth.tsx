import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { 
  loginUser, 
  registerUser, 
  logoutUser, 
  getCurrentUser, 
  isAuthenticated,
  User,
  LoginData,
  RegisterData
} from '../services/apiService';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  isAuth: boolean;
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

  const clearError = () => {
    console.log('Clearing error');
    setError(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = isAuthenticated();
      if (token) {
        try {
          const userData = await getCurrentUser();
          setUser(userData);
        } catch (error) {
          console.error('Error fetching user data:', error);
          setError('Ошибка загрузки данных пользователя');
          localStorage.removeItem('auth_token');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (loginData: LoginData) => {
    setLoading(true);
    try {
      const authData = await loginUser(loginData);
      setUser(authData.user);
      setError(null); // Очищаем ошибку только при успехе
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
      const result = await registerUser(registerData);
      // После регистрации автоматически логиним пользователя
      const authData = await loginUser({
        username: registerData.username,
        password: registerData.password
      });
      setUser(authData.user);
      setError(null); // Очищаем ошибку только при успехе
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
    setError(null); // При выходе очищаем ошибки
    try {
      await logoutUser();
      setUser(null);
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