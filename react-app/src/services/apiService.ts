const API_BASE_URL = 'http://localhost:8000';

let isRefreshing = false;
let refreshPromise: Promise<AuthResponse | null> | null = null;

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
  refresh_token: string;
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

export interface UpdateProfileData {
  username?: string;
  email?: string;
}

export interface ChangePasswordData {
  old_password: string;
  new_password: string;
  confirm_password: string;
}

export interface DeleteAccountResponse {
  message: string;
}

// Сохранение refresh токена
export const saveRefreshToken = (token: string): void => {
  localStorage.setItem('refresh_token', token);
};

// Получение refresh токена
export const getRefreshToken = (): string | null => {
  return localStorage.getItem('refresh_token');
};

// Удаление refresh токена
export const removeRefreshToken = (): void => {
  localStorage.removeItem('refresh_token');
};

// Сохранение токенов в localStorage
export const saveTokens = (accessToken: string, refreshToken: string): void => {
  localStorage.setItem('auth_token', accessToken);
  localStorage.setItem('refresh_token', refreshToken);
};

// Удаления всех токенов
export const removeTokens = (): void => {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('refresh_token');
};

// Получение access токена из localStorage
export const getToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Удаление access токена
export const removeToken = (): void => {
  localStorage.removeItem('auth_token');
};

// Обновление токенов
export const refreshTokens = async (): Promise<AuthResponse | null> => {
  const refreshToken = getRefreshToken();
  
  if (!refreshToken) {
    return null;
  }

  // Если уже идет обновление, возвращаем существующий промис
  if (isRefreshing && refreshPromise) {
    console.log('Token refresh already in progress, waiting...');
    return refreshPromise;
  }
  
  isRefreshing = true;
  
  refreshPromise = (async () => {
    try {
      console.log('Attempting to refresh tokens...');
      const response = await fetch(`${API_BASE_URL}/refresh-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${refreshToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.log('Refresh token response not OK:', response.status);
        removeTokens();
        return null;
      }
      
      const authData = await response.json();
      console.log('Tokens refreshed successfully');
      saveTokens(authData.access_token, authData.refresh_token);
      return authData;
    } catch (error) {
      console.error('Error refreshing tokens:', error);
      removeTokens();
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

// Проверка авторизации
export const isAuthenticated = (): boolean => {
  return !!getToken() && !!getRefreshToken();
};

export interface SaveAnalysisRequest {
  analysis_result: ImageAnalysisResponse;
  ingredients_count: number;
  warnings_count: number;
}

export interface SavedAnalysis {
  id: number;
  user_id: number;
  image_url: string;
  analysis_result: ImageAnalysisResponse;
  ingredients_count: number;
  warnings_count: number;
  created_at: string;
}

export interface SavedAnalysesResponse {
  analyses: SavedAnalysis[];
}

// Базовый запрос с авторизацией
const authFetch = async (url: string, options: RequestInit = {}) => {
  let token = getToken();
  
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

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // Если получили 401, пробуем обновить токен
  if (response.status === 401) {
    console.log('Token expired, attempting to refresh...');
    
    const newAuthData = await refreshTokens();
    
    if (newAuthData) {
      console.log('Token refreshed successfully, retrying request');
      // Обновляем токен в заголовках
      headers['Authorization'] = `Bearer ${newAuthData.access_token}`;
      
      // Повторяем запрос с новым токеном
      response = await fetch(url, {
        ...options,
        headers,
      });
      
      console.log('Retry response status:', response.status);
      
      // Если запрос успешен, возвращаем его
      if (response.ok) {
        return response;
      }
      
      // Если снова 401, значит что-то не так с новым токеном
      if (response.status === 401) {
        console.log('Retry also failed with 401, logging out');
        removeTokens();
        window.dispatchEvent(new Event('unauthorized'));
      }
    } else {
      console.log('Token refresh failed, logging out');
      removeTokens();
      window.dispatchEvent(new Event('unauthorized'));
    }
  }

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
  // Проверяем наличие обоих токенов в ответе
  if (authData.access_token && authData.refresh_token) {
    saveTokens(authData.access_token, authData.refresh_token);
  } else {
    // Если ответ не содержит нужные поля, возможно сервер вернул старый формат
    console.error('Unexpected auth response format:', authData);
    throw new Error('Неверный формат ответа от сервера');
  }
  return authData;
};

// Выход из системы
export const logoutUser = async (): Promise<void> => {
  const token = getToken();
  if (token) {
    try {
      const response = await authFetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
      });
      await handleError(response);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  }
  removeTokens();
};

// Получение информации о текущем пользователе
export const getCurrentUser = async (): Promise<User> => {
  const response = await authFetch(`${API_BASE_URL}/me`);

  if (!response.ok) {
    if (response.status === 401) {
      removeTokens();
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Ошибка получения данных пользователя');
  }

  return response.json();
};

// Обновление профиля пользователя
export const updateProfile = async (profileData: UpdateProfileData): Promise<User> => {
  const response = await authFetch(`${API_BASE_URL}/update-profile`, {
    method: 'POST',
    body: JSON.stringify(profileData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Ошибка обновления профиля');
  }

  return response.json();
};

// Смена пароля
export const changePassword = async (passwordData: ChangePasswordData): Promise<{ message: string }> => {
  const response = await authFetch(`${API_BASE_URL}/change-password`, {
    method: 'POST',
    body: JSON.stringify(passwordData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Ошибка смены пароля');
  }

  return response.json();
};

// Удаление аккаунта
export const deleteAccount = async (): Promise<DeleteAccountResponse> => {
  const response = await authFetch(`${API_BASE_URL}/delete-account`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Ошибка удаления аккаунта');
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

// Сохранение анализа
export const saveAnalysis = async (imageFile: File, analysisResult: ImageAnalysisResponse): Promise<SavedAnalysis> => {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('analysis_result', JSON.stringify(analysisResult));
  formData.append('ingredients_count', analysisResult.ingredients.length.toString());
  formData.append('warnings_count', analysisResult.warnings.length.toString());

  console.log('Отправка анализа:', {
    imageName: imageFile.name,
    imageSize: imageFile.size,
    imageType: imageFile.type,
    ingredientsCount: analysisResult.ingredients.length,
    warningsCount: analysisResult.warnings.length
  });

  try {
    const response = await authFetch(`${API_BASE_URL}/save-analysis`, {
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
      
      console.error('Ошибка сохранения анализа:', errorDetail);
      throw new Error(errorDetail);
    }

    return response.json();
  } catch (error) {
    console.error('Network error:', error);
    throw new Error('Ошибка сети при сохранении анализа');
  }
};

// Получение сохраненных анализов
export const getSavedAnalyses = async (): Promise<SavedAnalysesResponse> => {
  const response = await authFetch(`${API_BASE_URL}/saved-analyses`);

  if (!response.ok) {
    if (response.status === 401) {
      removeToken();
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Ошибка получения сохраненных анализов');
  }

  return response.json();
};

// Удаление сохраненного анализа
export const deleteSavedAnalysis = async (analysisId: number): Promise<{ message: string }> => {
  const response = await authFetch(`${API_BASE_URL}/saved-analyses/${analysisId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    if (response.status === 401) {
      removeToken();
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Ошибка удаления анализа');
  }

  return response.json();
};

// Перепроверка анализа с текущими медицинскими данными
export const reanalyzeSavedAnalysis = async (analysisId: number): Promise<SavedAnalysis> => {
  const response = await authFetch(`${API_BASE_URL}/reanalyze-analysis/${analysisId}`, {
    method: 'POST',
  });

  if (!response.ok) {
    if (response.status === 401) {
      removeToken();
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Ошибка перепроверки анализа');
  }

  return response.json();
};