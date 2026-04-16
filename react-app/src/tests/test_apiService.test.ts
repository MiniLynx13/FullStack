import {
  registerUser,
  loginUser,
  getCurrentUser,
  saveTokens,
  getToken,
  removeTokens,
  analyzeImage,
  getSavedAnalyses,
  deleteSavedAnalysis
} from '../services/apiService';

describe('apiService', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('token management', () => {
    test('saveTokens stores tokens in localStorage', () => {
      saveTokens('access123', 'refresh456');
      expect(localStorage.setItem).toHaveBeenCalledWith('auth_token', 'access123');
      expect(localStorage.setItem).toHaveBeenCalledWith('refresh_token', 'refresh456');
    });

    test('getToken returns token from localStorage', () => {
      jest.spyOn(localStorage, 'getItem').mockReturnValue('access123');
      expect(getToken()).toBe('access123');
    });

    test('removeTokens clears tokens', () => {
      removeTokens();
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth_token');
      expect(localStorage.removeItem).toHaveBeenCalledWith('refresh_token');
    });
  });

  describe('registerUser', () => {
    test('successful registration', async () => {
      const mockResponse = {
        message: 'Пользователь успешно зарегистрирован',
        user: { id: 1, username: 'testuser', email: 'test@test.com', role: 'user', created_at: '2024-01-01' }
      };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      const result = await registerUser({ username: 'testuser', email: 'test@test.com', password: 'pass123' });
      expect(result).toEqual(mockResponse);
    });

    test('registration fails with duplicate user', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ detail: 'Пользователь с таким именем уже существует' })
      });

      await expect(registerUser({ username: 'existing', email: 'test@test.com', password: 'pass123' }))
        .rejects.toThrow('Пользователь с таким именем уже существует');
    });
  });

  describe('loginUser', () => {
    test('successful login saves tokens', async () => {
      const mockAuthData = {
        access_token: 'access123',
        refresh_token: 'refresh456',
        token_type: 'bearer',
        user: { id: 1, username: 'testuser', email: 'test@test.com', role: 'user', created_at: '2024-01-01' }
      };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockAuthData
      });

      const result = await loginUser({ username: 'testuser', password: 'pass123' });
      expect(result).toEqual(mockAuthData);
      expect(localStorage.setItem).toHaveBeenCalledWith('auth_token', 'access123');
      expect(localStorage.setItem).toHaveBeenCalledWith('refresh_token', 'refresh456');
    });

    test('login fails with wrong credentials', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Неверное имя пользователя или пароль' })
      });

      await expect(loginUser({ username: 'wrong', password: 'wrong' }))
        .rejects.toThrow('Неверное имя пользователя или пароль');
    });
  });

  describe('getCurrentUser', () => {
    test('returns user data when authenticated', async () => {
      localStorage.getItem = jest.fn().mockReturnValue('access123');
      const mockUser = { id: 1, username: 'testuser', email: 'test@test.com', role: 'user', created_at: '2024-01-01' };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockUser
      });

      const result = await getCurrentUser();
      expect(result).toEqual(mockUser);
    });

    test('throws error when not authenticated', async () => {
      jest.spyOn(localStorage, 'getItem').mockReturnValue(null);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ detail: 'Требуется авторизация' })
      });

      await expect(getCurrentUser()).rejects.toThrow('Требуется авторизация');
    });
  });

  describe('analyzeImage', () => {
    test('successfully analyzes image', async () => {
      localStorage.getItem = jest.fn().mockReturnValue('access123');
      const mockAnalysis = {
        ingredients: [{ name: 'tomato', is_allergen: false, is_contraindication: false }],
        warnings: [],
        original_response: 'test'
      };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockAnalysis
      });

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      const result = await analyzeImage(file);
      expect(result).toEqual(mockAnalysis);
    });

    test('handles network error', async () => {
      localStorage.getItem = jest.fn().mockReturnValue('access123');
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
      await expect(analyzeImage(file)).rejects.toThrow('Ошибка сети при отправке изображения');
    });
  });

  describe('getSavedAnalyses', () => {
    test('returns saved analyses', async () => {
      localStorage.getItem = jest.fn().mockReturnValue('access123');
      const mockAnalyses = {
        analyses: [
          { id: 1, user_id: 1, image_url: 'url', analysis_result: {}, ingredients_count: 2, warnings_count: 0, created_at: '2024-01-01' }
        ]
      };
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockAnalyses
      });

      const result = await getSavedAnalyses();
      expect(result).toEqual(mockAnalyses);
    });
  });

  describe('deleteSavedAnalysis', () => {
    test('successfully deletes analysis', async () => {
      localStorage.getItem = jest.fn().mockReturnValue('access123');
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ message: 'Анализ успешно удален' })
      });

      const result = await deleteSavedAnalysis(1);
      expect(result.message).toBe('Анализ успешно удален');
    });
  });
});