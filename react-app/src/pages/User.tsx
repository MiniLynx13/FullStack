import React, { useState, useEffect, useCallback } from 'react';
import { Container, Box, Heading, Text, Button, Grid, GridItem, Textarea, createToaster } from '@chakra-ui/react';
import { useAuth } from '../hooks/useAuth';
import { getMedicalData, saveMedicalData, MedicalData } from '../services/apiService';
import { useNavigate } from 'react-router-dom';

function User() {
  const { user, logout, isAuth } = useAuth();
  const navigate = useNavigate();
  const toaster = createToaster();
  
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
      toaster.create({
        title: 'Ошибка',
        description: 'Не удалось загрузить медицинские данные',
        status: 'error',
        duration: 3000,
      });
    }
  }, [toaster]);

  // Редирект если пользователь не авторизован и загрузка данных при первом рендере
  useEffect(() => {
    if (!isAuth) {
      navigate('/authorisation');
    } else if (!initialLoad) {
      loadMedicalData();
      setInitialLoad(true);
    }
  }, [isAuth, navigate, loadMedicalData, initialLoad]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/authorisation');
    } catch (error) {
      console.error('Error logging out:', error);
      toaster.create({
        title: 'Ошибка',
        description: 'Не удалось выйти из системы',
        status: 'error',
        duration: 3000,
      });
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
      
      toaster.create({
        title: 'Успешно',
        description: 'Медицинские данные сохранены',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Error saving medical data:', error);
      toaster.create({
        title: 'Ошибка',
        description: 'Не удалось сохранить медицинские данные',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setSaveLoading(false);
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
                  <Text mb={2} color="blue.800">
                    <Text as="span" fontWeight="bold">Имя пользователя:</Text> {user?.username}
                  </Text>
                  <Text mb={2} color="blue.800">
                    <Text as="span" fontWeight="bold">Email:</Text> {user?.email}
                  </Text>
                  <Text color="blue.800">
                    <Text as="span" fontWeight="bold">Дата регистрации:</Text>{' '}
                    {user?.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : 'Неизвестно'}
                  </Text>
                </Box>
              </Box>
              
              {/* Добавим пустое пространство для выравнивания кнопки */}
              <Box flex="1"></Box>
              
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
              >
                Выйти
              </Button>
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
    </Container>
  );
}

export default User;