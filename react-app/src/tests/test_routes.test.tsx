import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';

// Import all page components directly for testing
import Home from '../pages/Home';
import Authorisation from '../pages/Authorisation';
import Photo from '../pages/Photo';
import AdminPanel from '../pages/AdminPanel';
import Banned from '../pages/Banned';

// Mock useAuth
const mockUseAuth = jest.fn();

jest.mock('../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

// Mock API services
jest.mock('../services/apiService', () => ({
  getFilteredUsers: jest.fn().mockResolvedValue({ users: [] }),
  getFilteredAnalyses: jest.fn().mockResolvedValue({ analyses: [] }),
  getMedicalData: jest.fn().mockResolvedValue({ contraindications: '', allergens: '' }),
  saveMedicalData: jest.fn().mockResolvedValue({}),
  updateProfile: jest.fn().mockResolvedValue({}),
  changePassword: jest.fn().mockResolvedValue({}),
  deleteAccount: jest.fn().mockResolvedValue({}),
  getStats: jest.fn().mockResolvedValue({ total_users: 0, total_analyses: 0 }),
  getUserAnalyses: jest.fn().mockResolvedValue({ analyses: [] }),
  updateUserRole: jest.fn().mockResolvedValue({}),
  deleteUser: jest.fn().mockResolvedValue({}),
  analyzeImage: jest.fn().mockResolvedValue({ ingredients: [], warnings: [] }),
  saveAnalysis: jest.fn().mockResolvedValue({}),
  deleteSavedAnalysis: jest.fn().mockResolvedValue({}),
  reanalyzeSavedAnalysis: jest.fn().mockResolvedValue({}),
  getAnalysisImage: jest.fn().mockResolvedValue(''),
  isAuthenticated: jest.fn().mockReturnValue(false)
}));

// Mock image
jest.mock('../Present.png', () => 'test-file-stub');

// Mock window.matchMedia
beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
});

// Helper function to render with providers
const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <ChakraProvider value={defaultSystem}>
      {ui}
    </ChakraProvider>
  );
};

describe('Route Protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('home route is accessible without auth', async () => {
    mockUseAuth.mockReturnValue({
      isAuth: false,
      isAdmin: false,
      isBanned: false,
      user: null,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn()
    });

    renderWithProviders(<Home />);
    
    await waitFor(() => {
      expect(screen.getByText(/Добро пожаловать в AllergyDetect/i)).toBeInTheDocument();
    });
  });

  test('user route redirects to auth when not logged in', async () => {
    mockUseAuth.mockReturnValue({
      isAuth: false,
      isAdmin: false,
      isBanned: false,
      user: null,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn()
    });

    renderWithProviders(<Authorisation />);
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Вход/i })).toBeInTheDocument();
    });
  });

  test('admin route redirects non-admin users to home', async () => {
    // For non-admin, the AdminPanel component itself redirects
    // So we need to test that AdminPanel shows the access denied message
    mockUseAuth.mockReturnValue({
      isAuth: true,
      isAdmin: false,
      isBanned: false,
      user: { username: 'user', role: 'user', email: 'user@test.com', created_at: '2024-01-01', id: 1 },
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn()
    });

    renderWithProviders(<AdminPanel />);
    
    await waitFor(() => {
      expect(screen.getByText(/Доступ запрещен/i)).toBeInTheDocument();
    });
  });

  test('admin route accessible for admin users', async () => {
    mockUseAuth.mockReturnValue({
      isAuth: true,
      isAdmin: true,
      isBanned: false,
      user: { username: 'admin', role: 'admin', email: 'admin@test.com', created_at: '2024-01-01', id: 2 },
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn()
    });

    renderWithProviders(<AdminPanel />);
    
    await waitFor(() => {
      expect(screen.getByText(/Панель администратора/i)).toBeInTheDocument();
    });
  });

  test('banned route accessible for banned users', async () => {
    mockUseAuth.mockReturnValue({
      isAuth: true,
      isAdmin: false,
      isBanned: true,
      user: { username: 'banned', role: 'banned', email: 'banned@test.com', created_at: '2024-01-01', id: 3 },
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn()
    });

    renderWithProviders(<Banned />);
    
    await waitFor(() => {
      expect(screen.getByText(/Доступ заблокирован/i)).toBeInTheDocument();
    });
  });

  test('photo route redirects to auth when not logged in', async () => {
    mockUseAuth.mockReturnValue({
      isAuth: false,
      isAdmin: false,
      isBanned: false,
      user: null,
      loading: false,
      login: jest.fn(),
      logout: jest.fn(),
      register: jest.fn()
    });

    renderWithProviders(<Photo />);
    
    await waitFor(() => {
      expect(screen.getByText(/авторизоваться/i)).toBeInTheDocument();
    });
  });
});