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
  
  // Создаем заголовки с правильным типом
  const headers: Record<string, string> = {};

  // Копируем существующие заголовки
  if (options.headers) {
    Object.entries(options.headers).forEach(([key, value]) => {
      headers[key] = value as string;
    });
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
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

export interface AnalyzedIngredient {
  name: string;
  is_allergen: boolean;
  is_contraindication: boolean;
}

export interface ImageAnalysisResponse {
  ingredients: AnalyzedIngredient[];
  warnings: string[];
  original_response: string;
}

// Анализ изображения
export const analyzeImage = async (imageFile: File): Promise<ImageAnalysisResponse> => {
  const formData = new FormData();
  formData.append('image', imageFile);

  console.log('Отправка изображения:', imageFile.name, 'размер:', imageFile.size, 'тип:', imageFile.type);

  try {
    const response = await authFetch(`${API_BASE_URL}/analyze-image`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        removeToken();
      }
      
      let errorDetail = `Ошибка ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        
        if (Array.isArray(errorData.detail)) {
          errorDetail = errorData.detail.map((err: any) => {
            if (typeof err === 'string') return err;
            if (err.msg) return err.msg;
            if (err.loc && err.msg) return `${err.loc.join('.')}: ${err.msg}`;
            return JSON.stringify(err);
          }).join(', ');
        } else if (typeof errorData.detail === 'string') {
          errorDetail = errorData.detail;
        } else if (errorData.message) {
          errorDetail = errorData.message;
        }
      } catch (parseError) {
        try {
          const text = await response.text();
          if (text) errorDetail = text;
        } catch {
          // Игнорируем ошибки при чтении текста
        }
      }
      
      console.error('Ошибка анализа изображения:', errorDetail);
      throw new Error(errorDetail);
    }

    return response.json();
  } catch (error) {
    console.error('Network error:', error);
    throw new Error('Ошибка сети при отправке изображения');
  }
};