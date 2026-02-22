import React from 'react';
import { Container, Box, Heading, Text, Button, Flex } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

// Иконка замка для забаненного пользователя
const LockIcon = () => (
  <svg 
    width="80" 
    height="80" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect 
      x="3" 
      y="11" 
      width="18" 
      height="11" 
      rx="2" 
      ry="2" 
      stroke="#1e40af" 
      strokeWidth="2"
    />
    <path 
      d="M7 11V7a5 5 0 0 1 10 0v4" 
      stroke="#1e40af" 
      strokeWidth="2" 
      strokeLinecap="round"
    />
    <circle cx="12" cy="16" r="1.5" fill="#1e40af" />
    <line 
      x1="16" 
      y1="20" 
      x2="20" 
      y2="24" 
      stroke="#dc2626" 
      strokeWidth="2" 
      strokeLinecap="round"
    />
    <line 
      x1="20" 
      y1="20" 
      x2="16" 
      y2="24" 
      stroke="#dc2626" 
      strokeWidth="2" 
      strokeLinecap="round"
    />
  </svg>
);

// Иконка администратора
const AdminIcon = () => (
  <svg 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path 
      d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4z" 
      stroke="#1e40af" 
      strokeWidth="2"
    />
    <path 
      d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" 
      stroke="#1e40af" 
      strokeWidth="2" 
      strokeLinecap="round"
    />
    <circle cx="17" cy="9" r="1.5" fill="#dc2626" />
    <circle cx="19" cy="11" r="1.5" fill="#dc2626" />
    <circle cx="21" cy="9" r="1.5" fill="#dc2626" />
  </svg>
);

function Banned() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/authorisation');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleGoHome = () => {
    navigate('/');
  };

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
        maxW="600px"
        py={12}
        px={8}
        borderRadius="xl"
        bg="#eff6ffe0"
        boxShadow="lg"
        textAlign="center"
      >
        <Box display="flex" flexDirection="column" gap={8} width="100%">
          {/* Иконка замка */}
          <Box 
            display="flex" 
            justifyContent="center" 
            alignItems="center"
            mb={4}
          >
            <Box
              p={4}
              borderRadius="full"
              bg="red.50"
              border="2px solid"
              borderColor="red.200"
            >
              <LockIcon />
            </Box>
          </Box>

          {/* Заголовок */}
          <Box>
            <Heading as="h1" size="2xl" color="blue.900" mb={4}>
              Доступ заблокирован
            </Heading>
            
            <Text 
              fontSize="xl" 
              color="blue.800"
              mb={6}
              fontWeight="medium"
            >
              Ваш аккаунт был забанен
            </Text>
            
            <Text 
              fontSize="lg" 
              color="blue.700"
              mb={8}
            >
              Вы не можете использовать функционал приложения
            </Text>
          </Box>

          {/* Информация о разблокировке */}
          <Box
            p={6}
            borderRadius="lg"
            bg="blue.50"
            border="1px solid"
            borderColor="blue.200"
            mb={4}
          >
            <Flex align="center" justify="center" gap={3} mb={3}>
              <AdminIcon />
              <Heading as="h3" size="md" color="blue.900">
                Как разблокировать аккаунт?
              </Heading>
            </Flex>
            
            <Text color="blue.800" fontSize="md">
              Для разблокировки необходимо обратиться к администратору
            </Text>
            <Text color="blue.700" fontSize="sm" mt={2}>
              • Напишите в поддержку
            </Text>
            <Text color="blue.700" fontSize="sm">
              • Объясните причину блокировки (если она вам известна)
            </Text>
          </Box>

          {/* Кнопки действий */}
          <Flex 
            direction={{ base: 'column', sm: 'row' }} 
            gap={4} 
            justify="center"
            mt={4}
          >
            <Button
              onClick={handleGoHome}
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
              flex={{ base: '1', sm: '0 1 auto' }}
              px={8}
            >
              На главную
            </Button>
            
            <Button
              onClick={handleLogout}
              variant="outline"
              colorScheme="blue"
              size="lg"
              borderColor="blue.300"
              _hover={{ 
                bg: 'blue.50',
                borderColor: 'blue.400' 
              }}
              _active={{ 
                bg: 'blue.100',
                borderColor: 'blue.500' 
              }}
              flex={{ base: '1', sm: '0 1 auto' }}
              px={8}
            >
              Выйти
            </Button>
          </Flex>

          {/* Дополнительная информация */}
          <Text color="blue.600" fontSize="sm" mt={6}>
            Если вы считаете, что блокировка ошибочна, свяжитесь с администратором
          </Text>
        </Box>
      </Box>
    </Container>
  );
}

export default Banned;