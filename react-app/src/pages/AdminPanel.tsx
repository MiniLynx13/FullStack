import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, Box, Heading, Text, Button, Flex, 
  Spinner, CloseButton 
} from '@chakra-ui/react';
import { useAuth } from '../hooks/useAuth';
import { 
  getAdminUsers, 
  updateUserRole, 
  adminDeleteUser,
  User
} from '../services/apiService';
import { useNavigate } from 'react-router-dom';

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

// Компонент строки пользователя
const UserRow = ({ 
  user, 
  onRoleChange, 
  onDelete,
  isUpdating,
  hasChanges
}: { 
  user: User;
  onRoleChange: (userId: number, newRole: string) => void;
  onDelete: (userId: number, username: string) => void;
  isUpdating: boolean;
  hasChanges: boolean;
}) => {
  const [selectedRole, setSelectedRole] = useState(user.role);

  // Синхронизируем selectedRole с актуальной ролью пользователя
  // когда нет ожидающих изменений
  useEffect(() => {
    if (!hasChanges) {
      setSelectedRole(user.role);
    }
  }, [user.role, hasChanges]);

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value;
    setSelectedRole(newRole);
    onRoleChange(user.id, newRole);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Box
      p={4}
      borderRadius="lg"
      border="1px solid"
      borderColor="blue.200"
      bg="white"
      mb={3}
      _hover={{ borderColor: 'blue.300', boxShadow: 'md' }}
    >
      <Flex direction={{ base: 'column', md: 'row' }} align={{ base: 'stretch', md: 'center' }} gap={4}>
        {/* Информация о пользователе */}
        <Box flex={2}>
          <Flex align="center" gap={2} mb={1}>
            <Text fontWeight="bold" color="blue.900" fontSize="lg">
              {user.username}
            </Text>
            {user.role === 'admin' && (
              <Box
                bg="purple.100"
                color="purple.700"
                px={2}
                py={1}
                borderRadius="full"
                fontSize="xs"
                fontWeight="bold"
              >
                ADMIN
              </Box>
            )}
            {user.role === 'banned' && (
              <Box
                bg="yellow.200"
                color="orange.700"
                px={2}
                py={1}
                borderRadius="full"
                fontSize="xs"
                fontWeight="bold"
              >
                BANNED
              </Box>
            )}
          </Flex>
          <Text color="blue.700" fontSize="sm">
            {user.email}
          </Text>
          <Text color="blue.600" fontSize="xs">
            Зарегистрирован: {formatDate(user.created_at)}
          </Text>
        </Box>

        {/* Выбор роли */}
        <Box flex={1}>
          <Box
            position="relative"
            width="100%"
          >
            <select
              value={selectedRole}
              onChange={handleRoleChange}
              disabled={isUpdating}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: hasChanges ? '1px solid #fbd38d' : '1px solid #90cdf4',
                backgroundColor: hasChanges ? '#fffaf0' : 'white',
                color: '#1e40af',
                fontSize: '16px',
                cursor: isUpdating ? 'not-allowed' : 'pointer',
                opacity: isUpdating ? 0.6 : 1,
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = hasChanges ? '#dd6b20' : '#3182ce';
                e.target.style.boxShadow = hasChanges 
                  ? '0 0 0 1px #dd6b20' 
                  : '0 0 0 1px #3182ce';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = hasChanges ? '#fbd38d' : '#90cdf4';
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="user">Пользователь</option>
              <option value="admin">Администратор</option>
              <option value="banned">Забанить</option>
            </select>
          </Box>
          {hasChanges && (
            <Text fontSize="xs" color="orange.600" mt={1}>
              Есть изменения
            </Text>
          )}
        </Box>

        {/* Кнопка удаления */}
        <Box flex={0.5}>
          <Button
            onClick={() => onDelete(user.id, user.username)}
            colorScheme="orange"
            variant="outline"
            size="md"
            width="full"
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
            loading={isUpdating}
            loadingText="Удаление"
          >
            Удалить
          </Button>
        </Box>
      </Flex>
    </Box>
  );
};

function AdminPanel() {
  const { user: currentUser, isAdmin, isAuth } = useAuth();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error' | 'warning' | 'info', message: string} | null>(null);
  
  // Состояния для модального окна удаления
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{id: number; username: string} | null>(null);
  
  // Состояния для отслеживания изменений ролей
  const [changedRoles, setChangedRoles] = useState<Map<number, string>>(new Map());
  const [savingRole, setSavingRole] = useState<number | null>(null);

  const showNotification = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Загрузка списка пользователей
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getAdminUsers();
      setUsers(response.users);
      setChangedRoles(new Map());
    } catch (error) {
      console.error('Error loading users:', error);
      showNotification('error', 'Не удалось загрузить список пользователей');
      
      // Если ошибка доступа, перенаправляем на главную
      if (error instanceof Error && error.message.includes('Доступ запрещен')) {
        setTimeout(() => navigate('/'), 2000);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // Проверка прав доступа
  useEffect(() => {
    if (!isAuth) {
      navigate('/authorisation');
    } else if (!isAdmin) {
      navigate('/');
    } else {
      loadUsers();
    }
  }, [isAuth, isAdmin, navigate, loadUsers]);

  // Обработка изменения роли
  const handleRoleChange = (userId: number, newRole: string) => {
    setChangedRoles(prev => {
      const newMap = new Map(prev);
      newMap.set(userId, newRole);
      return newMap;
    });
  };

  // Сохранение изменений роли
  const handleSaveRole = async (userId: number) => {
    const newRole = changedRoles.get(userId);
    if (!newRole) return;

    // Запрещаем админу менять свою собственную роль
    if (userId === currentUser?.id) {
      showNotification('warning', 'Нельзя изменить собственную роль');
      setChangedRoles(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
      return;
    }

    try {
      setSavingRole(userId);
      await updateUserRole({
        user_id: userId,
        new_role: newRole
      });
      
      // Обновляем список пользователей
      await loadUsers();
      showNotification('success', 'Роль пользователя успешно обновлена');
    } catch (error) {
      console.error('Error updating role:', error);
      showNotification('error', error instanceof Error ? error.message : 'Ошибка при обновлении роли');
    } finally {
      setSavingRole(null);
    }
  };

  // Отмена изменений роли
  const handleCancelRole = (userId: number) => {
    setChangedRoles(prev => {
      const newMap = new Map(prev);
      newMap.delete(userId);
      return newMap;
    });
  };

  // Подтверждение удаления пользователя
  const handleDeleteClick = (userId: number, username: string) => {
    // Запрещаем админу удалять самого себя
    if (userId === currentUser?.id) {
      showNotification('warning', 'Нельзя удалить собственный аккаунт');
      return;
    }
    
    setUserToDelete({ id: userId, username });
    setShowDeleteConfirm(true);
  };

  // Удаление пользователя
  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      setUpdatingId(userToDelete.id);
      await adminDeleteUser(userToDelete.id);
      
      // Обновляем список пользователей
      await loadUsers();
      showNotification('success', `Пользователь ${userToDelete.username} успешно удален`);
    } catch (error) {
      console.error('Error deleting user:', error);
      showNotification('error', error instanceof Error ? error.message : 'Ошибка при удалении пользователя');
    } finally {
      setUpdatingId(null);
      setUserToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  // Сохранение всех изменений
  const handleSaveAllChanges = async () => {
    const changes = Array.from(changedRoles.entries());
    
    for (const [userId] of changes) {
      if (userId !== currentUser?.id) { // Пропускаем себя
        await handleSaveRole(userId);
      }
    }
  };

  // Отмена всех изменений
  const handleCancelAllChanges = () => {
    setChangedRoles(new Map());
  };

  const hasAnyChanges = changedRoles.size > 0;

  // Показываем заглушку во время проверки прав
  if (!isAuth || !isAdmin) {
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
            {!isAuth ? 'Перенаправление на страницу авторизации...' : 'Доступ запрещен'}
          </Heading>
          {!isAuth ? (
            <Text color="blue.800">Пожалуйста, авторизуйтесь</Text>
          ) : (
            <Text color="blue.800">У вас нет прав для просмотра этой страницы</Text>
          )}
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
      alignItems="flex-start"
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

        {/* Заголовок */}
        <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={4}>
          <Box>
            <Heading as="h1" size="xl" color="blue.900" mb={2}>
              Панель администратора
            </Heading>
            <Text color="blue.800" fontSize="lg">
              Управление пользователями и их ролями
            </Text>
          </Box>

          {/* Кнопки управления изменениями */}
          {hasAnyChanges && (
            <Flex gap={3}>
              <Button
                onClick={handleSaveAllChanges}
                colorScheme="blue"
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
                loading={savingRole !== null}
                loadingText="Сохранение"
              >
                Сохранить все изменения
              </Button>
              <Button
                onClick={handleCancelAllChanges}
                variant="outline"
                colorScheme="blue"
                borderColor="blue.300"
                _hover={{ borderColor: 'blue.400', bg: 'blue.50' }}
              >
                Отменить все
              </Button>
            </Flex>
          )}
        </Flex>

        {/* Статистика */}
        <Flex gap={6} mb={8} wrap="wrap">
          <Box
            bg="blue.50"
            borderRadius="lg"
            p={4}
            border="1px solid"
            borderColor="blue.300"
            flex={1}
            minW="200px"
          >
            <Text color="blue.800" fontSize="sm">Всего пользователей</Text>
            <Text color="blue.900" fontSize="3xl" fontWeight="bold">{users.length}</Text>
          </Box>
          <Box
            bg="purple.50"
            borderRadius="lg"
            p={4}
            border="1px solid"
            borderColor="purple.300"
            flex={1}
            minW="200px"
          >
            <Text color="purple.800" fontSize="sm">Администраторов</Text>
            <Text color="purple.900" fontSize="3xl" fontWeight="bold">
              {users.filter(u => u.role === 'admin').length}
            </Text>
          </Box>
          <Box
            bg="yellow.50"
            borderRadius="lg"
            p={4}
            border="1px solid"
            borderColor="orange.300"
            flex={1}
            minW="200px"
          >
            <Text color="orange.800" fontSize="sm">Забанено</Text>
            <Text color="orange.900" fontSize="3xl" fontWeight="bold">
              {users.filter(u => u.role === 'banned').length}
            </Text>
          </Box>
        </Flex>

        {/* Список пользователей */}
        <Box>
          <Flex 
            p={3} 
            bg="blue.100" 
            borderRadius="lg" 
            mb={3}
            display={{ base: 'none', md: 'flex' }}
          >
            <Box flex={2} color="blue.900" fontWeight="bold">Пользователь</Box>
            <Box flex={1} color="blue.900" fontWeight="bold">Роль</Box>
            <Box flex={0.5} color="blue.900" fontWeight="bold">Действия</Box>
          </Flex>

          {loading ? (
            <Flex justify="center" align="center" py={12}>
              <Spinner size="xl" color="blue.500" />
            </Flex>
          ) : users.length === 0 ? (
            <Box textAlign="center" py={12}>
              <Text color="blue.800" fontSize="lg">Нет пользователей</Text>
            </Box>
          ) : (
            users.map(user => (
              <Box key={user.id}>
                <UserRow
                  user={user}
                  onRoleChange={handleRoleChange}
                  onDelete={handleDeleteClick}
                  isUpdating={updatingId === user.id || savingRole === user.id}
                  hasChanges={changedRoles.has(user.id)}
                />
                {/* Кнопки сохранения/отмены для конкретного пользователя */}
                {changedRoles.has(user.id) && (
                  <Flex justify="flex-end" gap={3} mb={3} mt={-2}>
                    <Button
                      size="sm"
                      colorScheme="blue"
                      onClick={() => handleSaveRole(user.id)}
                      loading={savingRole === user.id}
                      loadingText="Сохранение"
                    >
                      Сохранить для {user.username}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      colorScheme="blue"
                      onClick={() => handleCancelRole(user.id)}
                    >
                      Отмена
                    </Button>
                  </Flex>
                )}
              </Box>
            ))
          )}
        </Box>

        {/* Информация о текущем администраторе */}
        {currentUser && (
          <Box mt={8} pt={4} borderTop="1px solid" borderColor="blue.200">
            <Text color="blue.700" fontSize="sm">
              Вы вошли как <Text as="span" fontWeight="bold">{currentUser.username}</Text> 
              {' '}(<Text as="span" color="purple.600">администратор</Text>)
            </Text>
          </Box>
        )}
      </Box>

      {/* Модальное окно подтверждения удаления */}
      {showDeleteConfirm && userToDelete && (
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
              Подтверждение удаления пользователя
            </Heading>
            <Text color="blue.800" mb={2}>
              Вы уверены, что хотите удалить пользователя <Text as="span" fontWeight="bold">{userToDelete.username}</Text>?
            </Text>
            <Text color="orange.700" fontSize="sm" mb={6}>
              Это действие невозможно отменить. Будут удалены все данные пользователя, включая медицинские данные и историю анализов.
            </Text>
            <Flex gap={3} justify="flex-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setUserToDelete(null);
                }}
              >
                Отмена
              </Button>
              <Button 
                colorScheme="red" 
                onClick={handleDeleteUser}
                loading={updatingId === userToDelete.id}
                loadingText="Удаление"
              >
                Удалить пользователя
              </Button>
            </Flex>
          </Box>
        </Box>
      )}
    </Container>
  );
}

export default AdminPanel;