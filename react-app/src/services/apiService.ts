const API_BASE_URL = 'http://localhost:8000';

export interface PhraseResponse {
  phrase: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface LoginData {
  username: string;
  password: string;
}

export interface MedicalData {
  contraindications?: string;
  allergens?: string;
}

export interface MedicalDataResponse {
  user_id: number;
  contraindications?: string;
  allergens?: string;
  updated_at: string;
}

// Сохранение токена в localStorage
export const saveToken = (token: string): void => {
  localStorage.setItem('auth_token', token);
};

// Получение токена из localStorage
export const getToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Удаление токена
export const removeToken = (): void => {
  localStorage.removeItem('auth_token');
};

// Проверка авторизации
export const isAuthenticated = (): boolean => {
  return !!getToken();
};

// Базовый запрос с авторизацией
const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
};

// Функция для обработки ошибок
const handleError = async (response: Response) => {
  if (!response.ok) {
    let errorMessage = 'Произошла ошибка';
    
    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || `Ошибка ${response.status}`;
    } catch {
      errorMessage = `Ошибка ${response.status}: ${response.statusText}`;
    }
    
    throw new Error(errorMessage);
  }
  return response;
};

export const checkBackendConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/`);
    return response.ok;
  } catch (error) {
    console.error('Backend connection failed:', error);
    return false;
  }
};

// Очистка просроченных токенов (может быть использована для профилактической очистки)
export const cleanupExpiredTokens = async (): Promise<{ message: string }> => {
  const response = await authFetch(`${API_BASE_URL}/cleanup-tokens`, {
    method: 'POST',
  });

  await handleError(response);
  return response.json();
};

// Регистрация пользователя
export const registerUser = async (userData: RegisterData): Promise<{ message: string; user: User }> => {
  const response = await fetch(`${API_BASE_URL}/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  await handleError(response);
  return response.json();
};

// Авторизация пользователя
export const loginUser = async (loginData: LoginData): Promise<AuthResponse> => {
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(loginData),
  });

  await handleError(response);

  const authData = await response.json();
  saveToken(authData.access_token);
  return authData;
};

// Выход из системы
export const logoutUser = async (): Promise<void> => {
  const token = getToken();
  if (token) {
    const response = await authFetch(`${API_BASE_URL}/logout`, {
      method: 'POST',
    });
    await handleError(response);
  }
  removeToken();
};

// Получение информации о текущем пользователе
export const getCurrentUser = async (): Promise<User> => {
  const response = await authFetch(`${API_BASE_URL}/me`);

  if (!response.ok) {
    if (response.status === 401) {
      removeToken();
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Ошибка получения данных пользователя');
  }

  return response.json();
};

// Получение медицинских данных пользователя
export const getMedicalData = async (): Promise<MedicalDataResponse> => {
  const response = await authFetch(`${API_BASE_URL}/medical-data`);

  if (!response.ok) {
    if (response.status === 401) {
      removeToken();
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Ошибка получения медицинских данных');
  }

  return response.json();
};

// Сохранение медицинских данных пользователя
export const saveMedicalData = async (medicalData: MedicalData): Promise<MedicalDataResponse> => {
  const response = await authFetch(`${API_BASE_URL}/medical-data`, {
    method: 'POST',
    body: JSON.stringify(medicalData),
  });

  if (!response.ok) {
    if (response.status === 401) {
      removeToken();
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Ошибка сохранения медицинских данных');
  }

  return response.json();
};