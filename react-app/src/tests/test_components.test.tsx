import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import Header from '../components/Header';
import Authorisation from '../pages/Authorisation';
import Banned from '../pages/Banned';

// Мок для useAuth
jest.mock('../hooks/useAuth', () => ({
  useAuth: jest.fn(),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

const mockUseAuth = require('../hooks/useAuth').useAuth;

describe('Header Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('shows login/register links when not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuth: false,
      isAdmin: false,
      user: null,
      logout: jest.fn()
    });

    render(
      <BrowserRouter>
        <ChakraProvider value={defaultSystem}>
          <Header />
        </ChakraProvider>
      </BrowserRouter>
    );

    expect(screen.getAllByText('Вход')[0]).toBeInTheDocument();
    expect(screen.getByText('Регистрация')).toBeInTheDocument();
    expect(screen.queryByText('Личный кабинет')).not.toBeInTheDocument();
  });

  test('shows user menu when authenticated', () => {
    mockUseAuth.mockReturnValue({
      isAuth: true,
      isAdmin: false,
      user: { username: 'testuser' },
      logout: jest.fn()
    });

    render(
      <BrowserRouter>
        <ChakraProvider value={defaultSystem}>
          <Header />
        </ChakraProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Личный кабинет (testuser)')).toBeInTheDocument();
    expect(screen.getByText('Аллергены по фото')).toBeInTheDocument();
    expect(screen.getByText('Выйти')).toBeInTheDocument();
  });

  test('shows admin panel link for admin users', () => {
    mockUseAuth.mockReturnValue({
      isAuth: true,
      isAdmin: true,
      user: { username: 'admin' },
      logout: jest.fn()
    });

    render(
      <BrowserRouter>
        <ChakraProvider value={defaultSystem}>
          <Header />
        </ChakraProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Админ-панель')).toBeInTheDocument();
  });
});

describe('Authorisation Component', () => {
  const mockLogin = jest.fn();
  const mockRegister = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      login: mockLogin,
      register: mockRegister,
      loading: false,
      error: null,
      clearError: jest.fn(),
      isAuth: false
    });
  });

  test('renders login form by default', () => {
    render(
      <BrowserRouter>
        <ChakraProvider value={defaultSystem}>
          <Authorisation />
        </ChakraProvider>
      </BrowserRouter>
    );

    // Use heading for the title, and button for the tab
    expect(screen.getByRole('heading', { name: 'Вход' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Регистрация' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Введите имя пользователя')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Введите пароль')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Войти' })).toBeInTheDocument();
  });

  test('switches to register form', () => {
    render(
      <BrowserRouter>
        <ChakraProvider value={defaultSystem}>
          <Authorisation />
        </ChakraProvider>
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText('Регистрация'));
    
    expect(screen.getByPlaceholderText('Введите email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Повторите пароль')).toBeInTheDocument();
    expect(screen.getByText('Зарегистрироваться')).toBeInTheDocument();
  });

  test('submits login form', async () => {
    mockLogin.mockResolvedValue(undefined);
    
    render(
      <BrowserRouter>
        <ChakraProvider value={defaultSystem}>
          <Authorisation />
        </ChakraProvider>
      </BrowserRouter>
    );

    fireEvent.change(screen.getByPlaceholderText('Введите имя пользователя'), {
      target: { value: 'testuser' }
    });
    fireEvent.change(screen.getByPlaceholderText('Введите пароль'), {
      target: { value: 'password123' }
    });
    fireEvent.click(screen.getByText('Войти'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: 'testuser',
        password: 'password123'
      });
    });
  });

  test('shows error when passwords mismatch on registration', async () => {
    render(
      <BrowserRouter>
        <ChakraProvider value={defaultSystem}>
          <Authorisation />
        </ChakraProvider>
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText('Регистрация'));
    
    fireEvent.change(screen.getByPlaceholderText('Введите имя пользователя'), {
      target: { value: 'newuser' }
    });
    fireEvent.change(screen.getByPlaceholderText('Введите email'), {
      target: { value: 'new@test.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('Введите пароль'), {
      target: { value: 'pass123' }
    });
    fireEvent.change(screen.getByPlaceholderText('Повторите пароль'), {
      target: { value: 'pass456' }
    });
    fireEvent.click(screen.getByText('Зарегистрироваться'));

    await waitFor(() => {
      expect(screen.getByText('Пароли не совпадают')).toBeInTheDocument();
    });
    expect(mockRegister).not.toHaveBeenCalled();
  });
});

describe('Banned Component', () => {
  const mockLogout = jest.fn();

  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      logout: mockLogout
    });
  });

  test('renders banned page content', () => {
    render(
      <BrowserRouter>
        <ChakraProvider value={defaultSystem}>
          <Banned />
        </ChakraProvider>
      </BrowserRouter>
    );

    expect(screen.getByText('Доступ заблокирован')).toBeInTheDocument();
    expect(screen.getByText('Ваш аккаунт был забанен')).toBeInTheDocument();
    expect(screen.getByText('Как разблокировать аккаунт?')).toBeInTheDocument();
    expect(screen.getByText('На главную')).toBeInTheDocument();
    expect(screen.getByText('Выйти')).toBeInTheDocument();
  });

  test('logout button calls logout function', () => {
    render(
      <BrowserRouter>
        <ChakraProvider value={defaultSystem}>
          <Banned />
        </ChakraProvider>
      </BrowserRouter>
    );

    fireEvent.click(screen.getByText('Выйти'));
    expect(mockLogout).toHaveBeenCalled();
  });
});