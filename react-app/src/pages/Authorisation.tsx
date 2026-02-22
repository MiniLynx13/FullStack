import React, { useState, useEffect, useRef } from 'react';
import { Box, Container, Heading, Input, Button, Text, CloseButton } from '@chakra-ui/react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';

function Authorisation() {
  const { login, register, loading: authLoading, error: authError, clearError, isAuth } = useAuth();
  const navigate = useNavigate();
  const { search, pathname } = useLocation();
  
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [localError, setLocalError] = useState<string | null>(null);
  const [showAuthError, setShowAuthError] = useState<string | null>(null);
  
  // Сохраняем предыдущий путь для обнаружения смены страницы
  const prevPathnameRef = useRef(pathname);

  // Редирект если пользователь уже авторизован
  useEffect(() => {
    if (isAuth) {
      navigate('/user');
    }
  }, [isAuth, navigate]);

  // Синхронизация ошибки бэкенда с локальным состоянием
  useEffect(() => {
    if (authError) {
      setShowAuthError(authError);
    }
  }, [authError]);

  // Очистка ошибок при смене страницы
  useEffect(() => {
    if (pathname !== prevPathnameRef.current) {
      setShowAuthError(null);
      setLocalError(null);
      clearError();
      prevPathnameRef.current = pathname;
    }
  }, [pathname, clearError]);

  // Очистка только локальных ошибок при смене режима формы
  useEffect(() => {
    setLocalError(null);
  }, [isLogin]);

  useEffect(() => {
    const searchParams = new URLSearchParams(search);
    const tab = searchParams.get('tab');
    if (tab === 'register') {
      setIsLogin(false);
    } else {
      setIsLogin(true);
    }
  }, [search]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Сбрасываем только локальные ошибки при изменении полей
    if (localError) {
      setLocalError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!formData.username.trim() || !formData.password.trim()) {
      setLocalError('Заполните все обязательные поля');
      return;
    }

    if (!isLogin) {
      if (!formData.email.trim()) {
        setLocalError('Email обязателен для регистрации');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setLocalError('Пароли не совпадают');
        return;
      }
      if (formData.password.length < 6) {
        setLocalError('Пароль должен содержать минимум 6 символов');
        return;
      }
    }

    try {
      if (isLogin) {
        await login({
          username: formData.username,
          password: formData.password
        });
      } else {
        await register({
          username: formData.username,
          email: formData.email,
          password: formData.password
        });
      }
    } catch (err) {
      console.error('Auth error in component:', err);
    }
  };

  const handleSwitchToLogin = () => {
    setIsLogin(true);
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
    setLocalError(null);
    // Не сбрасываем ошибку бэкенда при переключении между формами
    navigate('/authorisation');
  };

  const handleSwitchToRegister = () => {
    setIsLogin(false);
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
    setLocalError(null);
    // Не сбрасываем ошибку бэкенда при переключении между формами
    navigate('/authorisation?tab=register');
  };

  const handleClearAuthError = () => {
    setShowAuthError(null);
    clearError();
  };

  // Показываем заглушку во время редиректа или если уже авторизован
  if (isAuth) {
    return (
      <Container maxW="1200px" py={8} bg="transparent" display="flex" alignItems="center" justifyContent="center" minH="calc(100vh - 200px)">
        <Box textAlign="center">
          <Heading as="h1" size="xl" color="blue.900" mb={4}>
            Перенаправление в личный кабинет...
          </Heading>
        </Box>
      </Container>
    );
  }

  return (
    <Container 
      maxW="1200px" 
      p={0} 
      bg="transparent"
      display="flex"
      alignItems="center"
      justifyContent="center"
      minH="calc(100vh - 200px)"
    >
      <Box
        width="100%"
        maxW="500px"
        py={8}
        px={6}
        borderRadius="xl"
        bg="#eff6ffe0"
        boxShadow="lg"
      >
        <Box display="flex" flexDirection="column" gap={6} width="100%">
          <Box textAlign="center">
            <Heading as="h1" size="xl" color="blue.900" mb={2}>
              {isLogin ? 'Вход' : 'Регистрация'}
            </Heading>
            <Text color="blue.700" fontSize="lg">
              {isLogin ? 'Войдите в свой аккаунт' : 'Создайте новый аккаунт'}
            </Text>
          </Box>

          {/* Переключение между входом и регистрацией */}
          <Box display="flex" gap={2} justifyContent="center" mb={4}>
            <Button
              onClick={handleSwitchToLogin}
              variant={isLogin ? 'solid' : 'outline'}
              colorScheme="blue"
              size="md"
              flex={1}
              type="button"
            >
              Вход
            </Button>
            <Button
              onClick={handleSwitchToRegister}
              variant={!isLogin ? 'solid' : 'outline'}
              colorScheme="blue"
              size="md"
              flex={1}
              type="button"
            >
              Регистрация
            </Button>
          </Box>

          {/* Форма */}
          <form onSubmit={handleSubmit}>
            <Box display="flex" flexDirection="column" gap={4} width="100%">
              {/* Имя пользователя */}
              <Box>
                <Text as="label" display="block" mb={2} color="blue.800" fontWeight="medium">
                  Имя пользователя
                </Text>
                <Input
                  type="text"
                  name="username"
                  placeholder="Введите имя пользователя"
                  value={formData.username}
                  onChange={handleChange}
                  size="lg"
                  borderColor="blue.300"
                  _hover={{ borderColor: 'blue.400' }}
                  _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)' }}
                  required
                />
              </Box>

              {/* Email (только для регистрации) */}
              {!isLogin && (
                <Box>
                  <Text as="label" display="block" mb={2} color="blue.800" fontWeight="medium">
                    Email
                  </Text>
                  <Input
                    type="email"
                    name="email"
                    placeholder="Введите email"
                    value={formData.email}
                    onChange={handleChange}
                    size="lg"
                    borderColor="blue.300"
                    _hover={{ borderColor: 'blue.400' }}
                    _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)' }}
                    required
                  />
                </Box>
              )}

              {/* Пароль */}
              <Box>
                <Text as="label" display="block" mb={2} color="blue.800" fontWeight="medium">
                  Пароль
                </Text>
                <Input
                  type="password"
                  name="password"
                  placeholder="Введите пароль"
                  value={formData.password}
                  onChange={handleChange}
                  size="lg"
                  borderColor="blue.300"
                  _hover={{ borderColor: 'blue.400' }}
                  _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)' }}
                  required
                />
              </Box>

              {/* Подтверждение пароля (только для регистрации) */}
              {!isLogin && (
                <Box>
                  <Text as="label" display="block" mb={2} color="blue.800" fontWeight="medium">
                    Подтвердите пароль
                  </Text>
                  <Input
                    type="password"
                    name="confirmPassword"
                    placeholder="Повторите пароль"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    size="lg"
                    borderColor="blue.300"
                    _hover={{ borderColor: 'blue.400' }}
                    _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)' }}
                    required
                  />
                </Box>
              )}

              {/* Локальные ошибки валидации */}
              {localError && (
                <Box 
                  bg="yellow.50"
                  border="1px solid"
                  borderColor="orange.300"
                  borderRadius="md"
                  p={4}
                  display="flex"
                  flexDirection="column"
                  gap={2}
                  position="relative"
                >
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box 
                      width="20px" 
                      height="20px" 
                      borderRadius="full" 
                      bg="orange.500" 
                      display="flex" 
                      alignItems="center" 
                      justifyContent="center"
                      color="white"
                      fontSize="12px"
                      fontWeight="bold"
                    >
                      !
                    </Box>
                    <Text fontWeight="bold" color="orange.700">Ошибка</Text>
                    <CloseButton 
                      position="absolute" 
                      right="8px" 
                      top="8px" 
                      onClick={() => setLocalError(null)}
                      color="orange.500"
                      _hover={{ color: 'orange.700' }}
                    />
                  </Box>
                  <Text color="orange.600">
                    {localError}
                  </Text>
                </Box>
              )}

              {/* Ошибки от бэкенда (сохраняются пока не закрыты вручную) */}
              {showAuthError && (
                <Box 
                  bg="yellow.50"
                  border="1px solid"
                  borderColor="orange.300"
                  borderRadius="md"
                  p={4}
                  display="flex"
                  flexDirection="column"
                  gap={2}
                  position="relative"
                >
                  <Box display="flex" alignItems="center" gap={2}>
                    <Box 
                      width="20px" 
                      height="20px" 
                      borderRadius="full" 
                      bg="orange.500" 
                      display="flex" 
                      alignItems="center" 
                      justifyContent="center"
                      color="white"
                      fontSize="12px"
                      fontWeight="bold"
                    >
                      !
                    </Box>
                    <Text fontWeight="bold" color="orange.700">Ошибка авторизации</Text>
                    <CloseButton 
                      position="absolute" 
                      right="8px" 
                      top="8px" 
                      onClick={handleClearAuthError}
                      color="orange.500"
                      _hover={{ color: 'orange.700' }}
                    />
                  </Box>
                  <Text color="orange.600">
                    {showAuthError}
                  </Text>
                </Box>
              )}

              {/* Кнопка отправки */}
              <Button
                type="submit"
                colorScheme="blue"
                size="lg"
                bg="blue.50"
                color="blue.800"
                border="2px solid"
                borderColor="blue.700"
                _hover={{ 
                  bg: 'blue.100',
                  borderColor: 'blue.800' 
                }}
                _active={{ 
                  bg: 'blue.200',
                  borderColor: 'blue.900' 
                }}
                loading={authLoading}
                loadingText={isLogin ? 'Вход...' : 'Регистрация...'}
                mt={2}
              >
                {isLogin ? 'Войти' : 'Зарегистрироваться'}
              </Button>
            </Box>
          </form>

          {/* Ссылка для переключения режима */}
          <Box textAlign="center" pt={2}>
            <Text color="blue.700">
              {isLogin ? 'Нет аккаунта?' : 'Уже есть аккаунт?'}{' '}
              <Button
                variant="ghost"
                color="blue.600"
                onClick={isLogin ? handleSwitchToRegister : handleSwitchToLogin}
                _hover={{ color: 'blue.800', textDecoration: 'underline' }}
                fontWeight="medium"
                height="auto"
                px={1}
                py={0}
                type="button"
              >
                {isLogin ? 'Зарегистрируйтесь' : 'Войдите'}
              </Button>
            </Text>
          </Box>
        </Box>
      </Box>
    </Container>
  );
}

export default Authorisation;