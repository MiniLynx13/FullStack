import React, { useState, useEffect, useCallback } from 'react';
import { Container, Box, Heading, Text, Button, Grid, GridItem, Textarea, Input, Flex, CloseButton } from '@chakra-ui/react';
import { useAuth } from '../hooks/useAuth';
import { getMedicalData, saveMedicalData, MedicalData, updateProfile, changePassword, deleteAccount } from '../services/apiService';
import { useNavigate } from 'react-router-dom';

// Иконка карандаша для редактирования (синяя)
const PencilIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ transform: 'rotate(-10deg)' }}
  >
    <path
      d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13"
      stroke="#1e40af"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z"
      stroke="#1e40af"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Компонент для уведомлений
const Notification = ({ 
  type = 'info', 
  message, 
  onClose 
}: { 
  type: 'success' | 'error' | 'warning' | 'info';
  message: React.ReactNode;
  onClose?: () => void;
}) => {
  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: '#d1fae5',
          borderColor: '#059669',
          color: '#065f46'
        };
      case 'error':
        return {
          bg: '#fee2e2',
          borderColor: '#dc2626',
          color: '#991b1b'
        };
      case 'warning':
        return {
          bg: '#fef3c7',
          borderColor: '#d97706',
          color: '#92400e'
        };
      default:
        return {
          bg: '#dbeafe',
          borderColor: '#3b82f6',
          color: '#1e40af'
        };
    }
  };

  const styles = getStyles();

  return (
    <Box
      borderRadius="md"
      border="1px solid"
      borderColor={styles.borderColor}
      bg={styles.bg}
      color={styles.color}
      p={4}
      mb={4}
      position="relative"
    >
      <Flex align="center" justify="space-between">
        <Box flex={1}>{message}</Box>
        {onClose && (
          <CloseButton
            size="sm"
            onClick={onClose}
            color={styles.color}
            _hover={{ opacity: 0.8 }}
          />
        )}
      </Flex>
    </Box>
  );
};

function User() {
  const { user, logout, isAuth, updateUser } = useAuth();
  const navigate = useNavigate();
  
  const [medicalData, setMedicalData] = useState<MedicalData>({
    contraindications: '',
    allergens: ''
  });
  const [savedData, setSavedData] = useState<MedicalData>({
    contraindications: '',
    allergens: ''
  });
  const [saveLoading, setSaveLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(false);
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'warning' | 'info', message: string} | null>(null);
  
  // Состояния для редактирования профиля
  const [editingUsername, setEditingUsername] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Состояния для смены пароля
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Состояния для удаления аккаунта
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Загрузка медицинских данных (только один раз при загрузке)
  const loadMedicalData = useCallback(async () => {
    try {
      const data = await getMedicalData();
      setMedicalData({
        contraindications: data.contraindications || '',
        allergens: data.allergens || ''
      });
      setSavedData({
        contraindications: data.contraindications || '',
        allergens: data.allergens || ''
      });
    } catch (error) {
      console.error('Error loading medical data:', error);
      showNotification('error', 'Не удалось загрузить медицинские данные');
    }
  }, []);

  // Редирект если пользователь не авторизован и загрузка данных при первом рендере
  useEffect(() => {
    if (!isAuth) {
      navigate('/authorisation');
    } else if (!initialLoad) {
      loadMedicalData();
      setInitialLoad(true);
    }
  }, [isAuth, navigate, loadMedicalData, initialLoad]);

  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/authorisation');
    } catch (error) {
      console.error('Error logging out:', error);
      showNotification('error', 'Не удалось выйти из системы');
    }
  };

  const handleMedicalChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMedicalData({
      ...medicalData,
      [e.target.name]: e.target.value
    });
  };

  const handleSaveMedical = async () => {
    try {
      setSaveLoading(true);
      await saveMedicalData(medicalData);
      setSavedData(medicalData);
      showNotification('success', 'Медицинские данные сохранены');
    } catch (error) {
      console.error('Error saving medical data:', error);
      showNotification('error', 'Не удалось сохранить медицинские данные');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleEditUsername = () => {
    setNewUsername(user?.username || '');
    setEditingUsername(true);
    setEditingEmail(false);
  };

  const handleEditEmail = () => {
    setNewEmail(user?.email || '');
    setEditingEmail(true);
    setEditingUsername(false);
  };

  const handleCancelEdit = () => {
    setEditingUsername(false);
    setEditingEmail(false);
    setNewUsername('');
    setNewEmail('');
  };

  const handleSaveProfile = async () => {
    // Проверяем, что хотя бы одно поле заполнено и не состоит только из пробелов
    const hasUsername = newUsername !== undefined && newUsername !== null && newUsername.trim() !== '';
    const hasEmail = newEmail !== undefined && newEmail !== null && newEmail.trim() !== '';
    
    // Если мы редактируем username, то проверяем его
    if (editingUsername && !hasUsername) {
      showNotification('error', 'Имя пользователя не может быть пустым');
      return;
    }
    
    // Если мы редактируем email, то проверяем его
    if (editingEmail && !hasEmail) {
      showNotification('error', 'Email не может быть пустым');
      return;
    }
    
    // Проверяем email формат если редактируем email
    if (editingEmail && hasEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail.trim())) {
        showNotification('error', 'Введите корректный email адрес');
        return;
      }
    }

    try {
      setProfileLoading(true);
      const updateData: any = {};
      
      if (editingUsername && hasUsername && newUsername.trim() !== user?.username) {
        updateData.username = newUsername.trim();
      }
      
      if (editingEmail && hasEmail && newEmail.trim() !== user?.email) {
        updateData.email = newEmail.trim();
      }
      
      // Если ничего не изменилось
      if (Object.keys(updateData).length === 0) {
        showNotification('info', 'Нет изменений для сохранения');
        handleCancelEdit();
        return;
      }

      const updatedUser = await updateProfile(updateData);

      // Обновляем контекст авторизации
      updateUser(updatedUser);
      
      showNotification('success', 'Профиль успешно обновлен');
      handleCancelEdit();
      
      // Обновляем данные пользователя на странице
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      showNotification('error', error instanceof Error ? error.message : 'Ошибка обновления профиля');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value
    });
  };

  const handleSavePassword = async () => {
    if (!passwordData.old_password || !passwordData.new_password || !passwordData.confirm_password) {
      showNotification('error', 'Заполните все поля для смены пароля');
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      showNotification('error', 'Новые пароли не совпадают');
      return;
    }

    if (passwordData.new_password.length < 6) {
      showNotification('error', 'Новый пароль должен содержать минимум 6 символов');
      return;
    }

    try {
      setPasswordLoading(true);
      await changePassword(passwordData);
      showNotification('success', 'Пароль успешно изменен');
      setPasswordData({
        old_password: '',
        new_password: '',
        confirm_password: ''
      });
      setShowChangePassword(false);
    } catch (error) {
      console.error('Error changing password:', error);
      showNotification('error', error instanceof Error ? error.message : 'Ошибка смены пароля');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleteLoading(true);
      await deleteAccount();
      showNotification('success', 'Аккаунт успешно удален');
      
      // Выходим и перенаправляем на страницу авторизации
      setTimeout(() => {
        logout();
        navigate('/authorisation');
      }, 1000);
    } catch (error) {
      console.error('Error deleting account:', error);
      showNotification('error', error instanceof Error ? error.message : 'Ошибка удаления аккаунта');
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const hasChanges = 
    medicalData.contraindications !== savedData.contraindications ||
    medicalData.allergens !== savedData.allergens;

  // Показываем заглушку во время редиректа или если не авторизован
  if (!isAuth) {
    return (
      <Container 
        maxW="1200px" 
        py={8} 
        bg="transparent" 
        display="flex" 
        alignItems="center" 
        justifyContent="center" 
        minH="calc(100vh - 200px)"
      >
        <Box textAlign="center">
          <Heading as="h1" size="xl" color="blue.900" mb={4}>
            Перенаправление на страницу авторизации...
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
        py={8}
        px={6}
        borderRadius="xl"
        bg="#eff6ffe0"
        boxShadow="lg"
      >
        {/* Уведомления */}
        {notification && (
          <Box mb={6}>
            <Notification 
              type={notification.type}
              message={notification.message}
              onClose={() => setNotification(null)}
            />
          </Box>
        )}

        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={8}>
          {/* Левая часть: Информация о пользователе */}
          <GridItem>
            <Box 
              py={8}
              px={6}
              borderRadius="xl"
              bg="#eff6ff50"
              height="100%"
              display="flex"
              flexDirection="column"
            >
              <Heading as="h1" size="xl" color="blue.900" mb={6} textAlign="left">
                Личный кабинет
              </Heading>
              
              <Box mb={6}>
                <Heading as="h3" size="md" color="blue.900" mb={3}>
                  Информация о пользователе
                </Heading>
                <Box 
                  p={0}
                  bg="transparent"
                >
                  {/* Имя пользователя с кнопкой редактирования */}
                  <Flex align="center" gap={2} mb={2}>
                    <Text color="blue.800" flex="1">
                      <Text as="span" fontWeight="bold">Имя пользователя:</Text>{' '}
                      {editingUsername ? (
                        <Input
                          value={newUsername}
                          onChange={(e) => setNewUsername(e.target.value)}
                          size="sm"
                          width="200px"
                          borderColor="blue.300"
                          _hover={{ borderColor: 'blue.400' }}
                        />
                      ) : (
                        user?.username
                      )}
                    </Text>
                    {!editingUsername && !editingEmail && (
                      <Button
                        onClick={handleEditUsername}
                        size="sm"
                        p={1}
                        minW="auto"
                        height="auto"
                        bg="blue.50"
                        border="1px solid"
                        borderColor="blue.300"
                        _hover={{ bg: 'blue.100', borderColor: 'blue.400' }}
                      >
                        <PencilIcon />
                      </Button>
                    )}
                  </Flex>

                  {/* Email с кнопкой редактирования */}
                  <Flex align="center" gap={2} mb={2}>
                    <Text color="blue.800" flex="1">
                      <Text as="span" fontWeight="bold">Email:</Text>{' '}
                      {editingEmail ? (
                        <Input
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          size="sm"
                          width="200px"
                          borderColor="blue.300"
                          _hover={{ borderColor: 'blue.400' }}
                        />
                      ) : (
                        user?.email
                      )}
                    </Text>
                    {!editingUsername && !editingEmail && (
                      <Button
                        onClick={handleEditEmail}
                        size="sm"
                        p={1}
                        minW="auto"
                        height="auto"
                        bg="blue.50"
                        border="1px solid"
                        borderColor="blue.300"
                        _hover={{ bg: 'blue.100', borderColor: 'blue.400' }}
                      >
                        <PencilIcon />
                      </Button>
                    )}
                  </Flex>

                  <Text color="blue.800" mb={4}>
                    <Text as="span" fontWeight="bold">Дата регистрации:</Text>{' '}
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : 'Неизвестно'}
                  </Text>

                  {/* Кнопки редактирования профиля */}
                  {(editingUsername || editingEmail) && (
                    <Flex gap={2} mb={4}>
                      <Button
                        onClick={handleSaveProfile}
                        colorScheme="blue"
                        size="sm"
                        loading={profileLoading}
                        loadingText="Сохранение..."
                      >
                        Сохранить
                      </Button>
                      <Button
                        onClick={handleCancelEdit}
                        variant="outline"
                        colorScheme="blue"
                        size="sm"
                      >
                        Отмена
                      </Button>
                    </Flex>
                  )}

                  {/* Ссылка для смены пароля */}
                  {!editingUsername && !editingEmail && (
                    <Box mb={4}>
                      <Button
                        variant="ghost"
                        color="blue.600"
                        size="sm"
                        onClick={() => setShowChangePassword(!showChangePassword)}
                        _hover={{ color: 'blue.800', textDecoration: 'underline' }}
                      >
                        {showChangePassword ? 'Скрыть смену пароля' : 'Сменить пароль'}
                      </Button>
                    </Box>
                  )}

                  {/* Форма смены пароля */}
                  {showChangePassword && !editingUsername && !editingEmail && (
                    <Box 
                      p={4}
                      borderRadius="md"
                      bg="blue.50"
                      border="1px solid"
                      borderColor="blue.200"
                      mb={4}
                    >
                      <Heading as="h4" size="sm" color="blue.900" mb={3}>
                        Смена пароля
                      </Heading>
                      
                      <Box mb={3}>
                        <Text as="label" display="block" mb={1} color="blue.800" fontSize="sm">
                          Старый пароль
                        </Text>
                        <Input
                          type="password"
                          name="old_password"
                          value={passwordData.old_password}
                          onChange={handlePasswordChange}
                          size="sm"
                          borderColor="blue.300"
                          _hover={{ borderColor: 'blue.400' }}
                        />
                      </Box>
                      
                      <Box mb={3}>
                        <Text as="label" display="block" mb={1} color="blue.800" fontSize="sm">
                          Новый пароль
                        </Text>
                        <Input
                          type="password"
                          name="new_password"
                          value={passwordData.new_password}
                          onChange={handlePasswordChange}
                          size="sm"
                          borderColor="blue.300"
                          _hover={{ borderColor: 'blue.400' }}
                        />
                      </Box>
                      
                      <Box mb={3}>
                        <Text as="label" display="block" mb={1} color="blue.800" fontSize="sm">
                          Повторите новый пароль
                        </Text>
                        <Input
                          type="password"
                          name="confirm_password"
                          value={passwordData.confirm_password}
                          onChange={handlePasswordChange}
                          size="sm"
                          borderColor="blue.300"
                          _hover={{ borderColor: 'blue.400' }}
                        />
                      </Box>
                      
                      <Flex gap={2}>
                        <Button
                          onClick={handleSavePassword}
                          colorScheme="blue"
                          size="sm"
                          loading={passwordLoading}
                          loadingText="Смена..."
                        >
                          Сменить пароль
                        </Button>
                        <Button
                          onClick={() => setShowChangePassword(false)}
                          variant="outline"
                          colorScheme="blue"
                          size="sm"
                        >
                          Отмена
                        </Button>
                      </Flex>
                    </Box>
                  )}
                </Box>
              </Box>
              
              {/* Добавим пустое пространство для выравнивания кнопок */}
              <Box flex="1"></Box>
              
              {/* Кнопки Выйти и Удалить аккаунт */}
              <Box>
                <Button
                  onClick={handleLogout}
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
                  width="full"
                  mb={2}
                >
                  Выйти
                </Button>

                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  colorScheme="orange"
                  variant="outline"
                  size="lg"
                  bg="yellow.50"
                  color="orange.700"
                  border="2px solid"
                  borderColor="orange.300"
                  _hover={{ 
                    bg: 'yellow.100',
                    borderColor: 'orange.400',
                    color: 'orange.800'
                  }}
                  _active={{ 
                    bg: 'yellow.200',
                    borderColor: 'orange.500' 
                  }}
                  width="full"
                >
                  Удалить аккаунт
                </Button>
              </Box>
            </Box>
          </GridItem>

          {/* Правая часть: Медицинские данные */}
          <GridItem>
            <Box 
              py={8}
              px={6}
              borderRadius="xl"
              bg="#eff6ff50"
              height="100%"
              display="flex"
              flexDirection="column"
            >
              <Heading as="h2" size="lg" color="blue.900" mb={6} textAlign="left">
                Медицинские данные
              </Heading>
              
              <Box mb={6}>
                <Heading as="h4" size="md" color="blue.900" mb={3}>
                  Противопоказания
                </Heading>
                <Text mb={2} fontSize="sm" color="blue.800">
                  Укажите ваши медицинские противопоказания (на английском):
                </Text>
                <Textarea
                  name="contraindications"
                  placeholder="Пример: diabetes, hypertension, kidney problems..."
                  value={medicalData.contraindications}
                  onChange={handleMedicalChange}
                  size="lg"
                  minH="120px"
                  borderColor="blue.300"
                  color="blue.800"
                  _hover={{ borderColor: 'blue.400' }}
                  _focus={{ 
                    borderColor: 'blue.500', 
                    boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)' 
                  }}
                  resize="vertical"
                />
              </Box>
              
              <Box mb={8}>
                <Heading as="h4" size="md" color="blue.900" mb={3}>
                  Аллергены
                </Heading>
                <Text mb={2} fontSize="sm" color="blue.800">
                  Укажите ваши аллергены (на английском):
                </Text>
                <Textarea
                  name="allergens"
                  placeholder="Пример: peanuts, shellfish, milk, eggs..."
                  value={medicalData.allergens}
                  onChange={handleMedicalChange}
                  size="lg"
                  minH="120px"
                  borderColor="blue.300"
                  color="blue.800"
                  _hover={{ borderColor: 'blue.400' }}
                  _focus={{ 
                    borderColor: 'blue.500', 
                    boxShadow: '0 0 0 1px var(--chakra-colors-blue-500)' 
                  }}
                  resize="vertical"
                />
              </Box>
              
              {/* Пустое пространство для выравнивания */}
              <Box flex="1"></Box>
              
              <Button
                onClick={handleSaveMedical}
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
                disabled={!hasChanges}
                loading={saveLoading}
                loadingText="Сохранение..."
                width="full"
                mb={2}
              >
                Сохранить медицинские данные
              </Button>
              
              {!hasChanges && !saveLoading && (
                <Text mt={3} color="green.700" fontSize="sm" textAlign="center">
                  Все изменения сохранены
                </Text>
              )}
            </Box>
          </GridItem>
        </Grid>
      </Box>

      {/* Модальное окно подтверждения удаления аккаунта */}
      {showDeleteConfirm && (
        <Box
          position="fixed"
          top="0"
          left="0"
          right="0"
          bottom="0"
          bg="rgba(0,0,0,0.5)"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex={1000}
        >
          <Box
            bg="white"
            borderRadius="lg"
            p={6}
            maxW="400px"
            width="90%"
          >
            <Heading size="md" color="blue.900" mb={4}>
              Подтверждение удаления аккаунта
            </Heading>
            <Text color="blue.800" mb={2}>
              Вы уверены, что хотите удалить свой аккаунт?
            </Text>
            <Text color="orange.700" fontSize="sm" mb={6}>
              Это действие невозможно отменить. Будут удалены все ваши данные, включая медицинские данные и историю анализов.
            </Text>
            <Flex gap={3} justify="flex-end">
              <Button
                variant="ghost"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Отмена
              </Button>
              <Button 
                colorScheme="red" 
                onClick={handleDeleteAccount}
                loading={deleteLoading}
                loadingText="Удаление"
              >
                Удалить аккаунт
              </Button>
            </Flex>
          </Box>
        </Box>
      )}
    </Container>
  );
}

export default User;