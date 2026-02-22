import React from 'react';
import { Box, Flex, Text, Button } from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Header: React.FC = () => {
  const { isAuth, isAdmin, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/authorisation');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <Box 
      as="header" 
      bg="blue.50" 
      color="blue.900" 
      py={4} 
      px={8}
      boxShadow="sm"
      borderBottom="1px solid"
      borderColor="blue.100"
      position="relative"
    >
      <Flex justify="space-between" align="center" maxW="1200px" mx="auto">
        {/* Логотип/ссылка на главную */}
        <RouterLink to="/" style={{ textDecoration: 'none' }}>
          <Text 
            fontSize="2xl" 
            fontWeight="bold"
            color="blue.800"
            _hover={{ color: 'blue.600' }}
            transition="color 0.2s"
            cursor="pointer"
          >
            AllergyDetect
          </Text>
        </RouterLink>

        {/* Навигация */}
        <Flex gap={8} align="center">
          {!isAuth ? (
            <Flex gap={2} align="center">
              <RouterLink to="/authorisation">
                <Text
                  color="blue.800"
                  fontSize="lg"
                  fontWeight="medium"
                  _hover={{ color: 'blue.600' }}
                  transition="color 0.2s"
                  cursor="pointer"
                >
                  Вход
                </Text>
              </RouterLink>
              <Text color="blue.400">/</Text>
              <RouterLink to="/authorisation?tab=register">
                <Text
                  color="blue.800"
                  fontSize="lg"
                  fontWeight="medium"
                  _hover={{ color: 'blue.600' }}
                  transition="color 0.2s"
                  cursor="pointer"
                >
                  Регистрация
                </Text>
              </RouterLink>
            </Flex>
          ) : (
            <Flex gap={8} align="center">
              {/* Ссылка на админ-панель (только для администратора) */}
              {isAdmin && (
                <RouterLink to="/admin">
                  <Text
                    color="purple.600"
                    fontSize="lg"
                    fontWeight="bold"
                    _hover={{ color: 'purple.800' }}
                    transition="color 0.2s"
                    cursor="pointer"
                  >
                    Админ-панель
                  </Text>
                </RouterLink>
              )}

              <RouterLink to="/photo">
                <Text
                  color="blue.800"
                  fontSize="lg"
                  fontWeight="medium"
                  _hover={{ color: 'blue.600' }}
                  transition="color 0.2s"
                  cursor="pointer"
                >
                  Аллергены по фото
                </Text>
              </RouterLink>
              
              {/* Ссылка на личный кабинет */}
              <RouterLink to="/user">
                <Text
                  color="blue.800"
                  fontSize="lg"
                  fontWeight="medium"
                  _hover={{ color: 'blue.600' }}
                  transition="color 0.2s"
                  cursor="pointer"
                >
                  Личный кабинет ({user?.username})
                </Text>
              </RouterLink>
              
              {/* Кнопка Выйти */}
              <Button
                onClick={handleLogout}
                colorScheme="blue"
                size="md"
                variant="outline"
                border="2px solid"
                borderColor="blue.700"
                color="blue.800"
                bg="blue.50"
                _hover={{ 
                  bg: 'blue.100',
                  borderColor: 'blue.800'
                }}
                _active={{ 
                  bg: 'blue.200',
                  borderColor: 'blue.900'
                }}
              >
                Выйти
              </Button>
            </Flex>
          )}
        </Flex>
      </Flex>
    </Box>
  );
};

export default Header;