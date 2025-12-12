import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Container, Box, Heading, Text, Button, Grid, GridItem, 
  Input, Flex, Spinner, CloseButton, Image
} from '@chakra-ui/react';
import { useAuth } from '../hooks/useAuth';
import { 
  analyzeImage, 
  ImageAnalysisResponse, 
  AnalyzedIngredient,
  saveAnalysis,
  getSavedAnalyses,
  deleteSavedAnalysis,
  reanalyzeSavedAnalysis,
  SavedAnalysis
} from '../services/apiService';
import { useNavigate } from 'react-router-dom';

// Простые SVG иконки стрелок
const ChevronLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// Иконки в темно-синем цвете (#1e40af)
const CircleCrossIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="#1e40af" strokeWidth="2"/>
    <line x1="8" y1="8" x2="16" y2="16" stroke="#1e40af" strokeWidth="2"/>
    <line x1="16" y1="8" x2="8" y2="16" stroke="#1e40af" strokeWidth="2"/>
  </svg>
);

const TriangleWarningIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 9v4" stroke="#1e40af" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 17h.01" stroke="#1e40af" strokeWidth="2" strokeLinecap="round"/>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" 
          stroke="#1e40af" strokeWidth="2" fill="none"/>
  </svg>
);

const RefreshIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M23 4v6h-6" stroke="#1e40af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M1 20v-6h6" stroke="#1e40af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" stroke="#1e40af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke="#1e40af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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

// Компонент для кнопки с иконкой обновления
const RefreshButton = ({ 
  onClick, 
  loading, 
  loadingText,
  ...props 
}: { 
  onClick: () => void;
  loading: boolean;
  loadingText: string;
  [key: string]: any;
}) => {
  return (
    <Button
      onClick={onClick}
      colorScheme="blue"
      variant="outline"
      flex={1}
      loading={loading}
      loadingText={loadingText}
      {...props}
    >
      <Flex align="center" gap={2}>
        <Box><RefreshIcon /></Box>
        <Text>Перепроверить</Text>
      </Flex>
    </Button>
  );
};

// Кастомная кнопка со стрелкой
const ArrowIconButton = ({ 
  icon, 
  onClick, 
  label,
  ...props 
}: { 
  icon: React.ReactElement;
  onClick: () => void;
  label: string;
  [key: string]: any;
}) => {
  return (
    <Button
      aria-label={label}
      onClick={onClick}
      colorScheme="blue"
      variant="outline"
      p={2}
      minW="auto"
      {...props}
    >
      {icon}
    </Button>
  );
};

function Photo() {
  const { isAuth } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [currentAnalysisIndex, setCurrentAnalysisIndex] = useState<number>(0);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [reanalyzingId, setReanalyzingId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [analysisToDelete, setAnalysisToDelete] = useState<number | null>(null);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Пожалуйста, выберите файл изображения');
        return;
      }
      
      setSelectedImage(file);
      setError(null);
      setAnalysisResult(null);
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) {
      setError('Пожалуйста, выберите изображение');
      return;
    }

    if (!isAuth) {
      setError('Для анализа изображения необходимо авторизоваться');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await analyzeImage(selectedImage);
      setAnalysisResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка при анализе');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAnalysis = async () => {
    if (!selectedImage || !analysisResult) {
      setError('Нет результатов анализа для сохранения');
      return;
    }

    if (!isAuth) {
      setError('Для сохранения анализа необходимо авторизоваться');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const saved = await saveAnalysis(selectedImage, analysisResult);
      // Добавляем новый анализ в начало списка
      const newAnalysis = { ...saved, is_reanalysis: false };
      const updatedAnalyses = [newAnalysis, ...savedAnalyses];
      setSavedAnalyses(updatedAnalyses);
      setCurrentAnalysisIndex(0); // Переключаемся на новый анализ
      
      // Очищаем текущий анализ
      setSelectedImage(null);
      setPreviewUrl('');
      setAnalysisResult(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      // Показываем сообщение об успехе
      setSuccess('Анализ успешно сохранен!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении анализа');
    } finally {
      setSaving(false);
    }
  };

  const loadSavedAnalyses = useCallback(async () => {
    if (!isAuth) return;
    
    setHistoryLoading(true);
    try {
      const response = await getSavedAnalyses();
      setSavedAnalyses(response.analyses);
      if (response.analyses.length > 0) {
        setCurrentAnalysisIndex(0);
      }
    } catch (err) {
      console.error('Ошибка загрузки истории:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [isAuth]);

  const handleDeleteAnalysis = async (id: number) => {
    setAnalysisToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteAnalysis = async () => {
    if (!analysisToDelete) return;
    
    setDeletingId(analysisToDelete);
    try {
      await deleteSavedAnalysis(analysisToDelete);
      // Обновляем список после удаления
      const updatedAnalyses = savedAnalyses.filter(analysis => analysis.id !== analysisToDelete);
      setSavedAnalyses(updatedAnalyses);
      
      // Если удалили текущий анализ, переключаемся на предыдущий или сбрасываем
      if (currentAnalysisIndex >= updatedAnalyses.length) {
        setCurrentAnalysisIndex(Math.max(0, updatedAnalyses.length - 1));
      }
      setSuccess('Анализ успешно удален!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при удалении анализа');
    } finally {
      setDeletingId(null);
      setAnalysisToDelete(null);
      setShowDeleteConfirm(false);
    }
  };

  const handleReanalyzeAnalysis = async (analysisId: number) => {
    if (!isAuth) {
      setError('Для перепроверки анализа необходимо авторизоваться');
      return;
    }

    setReanalyzingId(analysisId);
    setError(null);
    setSuccess(null);

    try {
      const result = await reanalyzeSavedAnalysis(analysisId);
      
      // Добавляем новый анализ в начало списка
      const updatedAnalyses = [result, ...savedAnalyses];
      setSavedAnalyses(updatedAnalyses);
      setCurrentAnalysisIndex(0); // Переключаемся на новый анализ
      
      // Показываем сообщение об успехе
      setSuccess('Анализ успешно перепроверен с текущими медицинскими данными!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при перепроверке анализа');
    } finally {
      setReanalyzingId(null);
    }
  };

  useEffect(() => {
    if (isAuth) {
      loadSavedAnalyses();
    }
  }, [isAuth, loadSavedAnalyses]);

  // Автоматическое скрытие уведомлений
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  const handleReset = () => {
    setSelectedImage(null);
    setPreviewUrl('');
    setAnalysisResult(null);
    setError(null);
    setSuccess(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getIngredientStyle = (ingredient: AnalyzedIngredient) => {
    if (ingredient.is_allergen || ingredient.is_contraindication) {
      return {
        padding: '8px 12px',
        borderRadius: '8px',
        margin: '4px 0',
        backgroundColor: '#fef9c3',
        border: '1px solid #facc15',
        color: '#713f12'
      };
    }
    return {
      padding: '8px 12px',
      borderRadius: '8px',
      margin: '4px 0',
      backgroundColor: '#f1f5f9',
      color: '#334155'
    };
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePrevAnalysis = () => {
    setCurrentAnalysisIndex(prev => prev > 0 ? prev - 1 : savedAnalyses.length - 1);
  };

  const handleNextAnalysis = () => {
    setCurrentAnalysisIndex(prev => prev < savedAnalyses.length - 1 ? prev + 1 : 0);
  };

  const currentAnalysis = savedAnalyses[currentAnalysisIndex];

  // Показываем страницу для неавторизованных пользователей
  if (!isAuth) {
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
          <Flex direction="column" align="center" gap={6}>
            <Heading as="h1" size="xl" color="blue.900" textAlign="center">
              Анализ аллергенов по фото
            </Heading>
            
            <Box textAlign="center">
              <Text color="blue.800" fontSize="lg" mb={4}>
                Для анализа изображения и проверки аллергенов необходимо авторизоваться
              </Text>
              
              <Button
                onClick={() => navigate('/authorisation')}
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
                Войти / Зарегистрироваться
              </Button>
            </Box>
          </Flex>
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
        borderRadius="xl"
        bg="transparent"
      >
        <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={8}>
          {/* Левая часть: Загрузка и анализ фото */}
          <GridItem>
            <Box
              py={8}
              px={6}
              borderRadius="xl"
              bg="#eff6ffe0"
              boxShadow="lg"
              height="100%"
              display="flex"
              flexDirection="column"
            >
              <Heading as="h1" size="xl" color="blue.900" mb={6}>
                Анализ аллергенов по фото
              </Heading>

              {/* Выбор изображения */}
              <Box mb={6}>
                <Text as="label" display="block" mb={3} color="blue.800" fontWeight="medium">
                  Выберите изображение
                </Text>
                <Flex gap={4} align="center">
                  <Box flex={1}>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      ref={fileInputRef}
                      size="lg"
                      borderColor="blue.300"
                      _hover={{ borderColor: 'blue.400' }}
                      padding={1}
                    />
                  </Box>
                  {selectedImage && (
                    <Button
                      onClick={handleReset}
                      size="lg"
                      variant="outline"
                      colorScheme="blue"
                      borderColor="blue.300"
                      _hover={{ borderColor: 'blue.400' }}
                    >
                      Сбросить
                    </Button>
                  )}
                </Flex>
                {selectedImage && (
                  <Text mt={2} color="blue.700" fontSize="sm">
                    Выбрано: {selectedImage.name}
                  </Text>
                )}
              </Box>

              {/* Предпросмотр */}
              {previewUrl && (
                <Box mb={6} textAlign="center">
                  <Image
                    src={previewUrl}
                    alt="Preview"
                    borderRadius="lg"
                    boxShadow="md"
                    maxH="300px"
                    mx="auto"
                  />
                </Box>
              )}

              {/* Кнопка анализа */}
              {selectedImage && (
                <Box mb={6}>
                  <Button
                    onClick={handleAnalyze}
                    colorScheme="blue"
                    size="lg"
                    width="100%"
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
                    loading={loading}
                    loadingText="Анализ..."
                  >
                    Анализировать изображение
                  </Button>
                </Box>
              )}

              {/* Индикатор загрузки */}
              {loading && (
                <Flex justify="center" my={6}>
                  <Spinner size="xl" color="blue.500" />
                </Flex>
              )}

              {/* Результаты анализа */}
              {analysisResult && (
                <Box flex={1} overflow="auto">
                  <Box mb={6}>
                    <Heading as="h2" size="lg" color="blue.900" mb={4}>
                      Результаты анализа
                    </Heading>
                    
                    <Box mb={6}>
                      <Text fontWeight="bold" color="blue.800" mb={2}>
                        Ингредиенты:
                      </Text>
                      <Box maxH="500px" overflowY="auto" pr={2}>
                        {analysisResult.ingredients.map((ingredient, index) => (
                          <Flex 
                            key={index}
                            align="center"
                            gap={3}
                            style={getIngredientStyle(ingredient)}
                          >
                            <Text>• {ingredient.name}</Text>
                            {ingredient.is_allergen && <CircleCrossIcon />}
                            {ingredient.is_contraindication && <TriangleWarningIcon />}
                          </Flex>
                        ))}
                      </Box>
                    </Box>

                    {analysisResult.warnings.length > 0 ? (
                      <Notification 
                        type="warning"
                        message={
                          <Box>
                            <Text fontWeight="bold" mb={2}>
                              Обнаружены аллергены/противопоказания:
                            </Text>
                            <Box as="ul" pl={5}>
                              {analysisResult.warnings.map((warning, index) => (
                                <li key={index}>{warning}</li>
                              ))}
                            </Box>
                          </Box>
                        }
                      />
                    ) : (
                      <Notification 
                        type="success"
                        message="Не обнаружено аллергенов и противопоказаний"
                      />
                    )}
                  </Box>

                  {/* Кнопка сохранения */}
                  <Button
                    onClick={handleSaveAnalysis}
                    colorScheme="blue"
                    size="lg"
                    width="100%"
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
                    loading={saving}
                    loadingText="Сохранение..."
                  >
                    Сохранить результат
                  </Button>
                </Box>
              )}
            </Box>
          </GridItem>

          {/* Правая часть: История анализов */}
          <GridItem>
            <Box
              py={8}
              px={6}
              borderRadius="xl"
              bg="#eff6ffe0"
              boxShadow="lg"
              height="100%"
              display="flex"
              flexDirection="column"
            >
              <Heading as="h2" size="xl" color="blue.900" mb={6}>
                История анализов
              </Heading>

              {historyLoading ? (
                <Flex justify="center" align="center" flex={1}>
                  <Spinner size="xl" color="blue.500" />
                </Flex>
              ) : savedAnalyses.length === 0 ? (
                <Flex direction="column" align="center" justify="center" flex={1} textAlign="center">
                  <Text color="blue.800" fontSize="lg" mb={4}>
                    История анализов пуста
                  </Text>
                  <Text color="blue.800">
                    Проанализируйте и сохраните первый анализ!
                  </Text>
                </Flex>
              ) : (
                <>
                  {/* Информация о текущем анализе */}
                  <Flex justify="space-between" align="center" mb={6}>
                    <Text color="blue.800" fontSize="lg">
                      Анализ {savedAnalyses.length - currentAnalysisIndex} из {savedAnalyses.length}
                    </Text>
                    {savedAnalyses.length > 1 && (
                      <Flex gap={2}>
                        <ArrowIconButton
                          icon={<ChevronLeftIcon />}
                          onClick={handlePrevAnalysis}
                          label="Предыдущий анализ"
                          borderColor="blue.300"
                          _hover={{ borderColor: 'blue.400' }}
                        />
                        <ArrowIconButton
                          icon={<ChevronRightIcon />}
                          onClick={handleNextAnalysis}
                          label="Следующий анализ"
                          borderColor="blue.300"
                          _hover={{ borderColor: 'blue.400' }}
                        />
                      </Flex>
                    )}
                  </Flex>

                  {/* Отображение текущего анализа */}
                  {currentAnalysis && (
                    <Box
                      borderRadius="lg"
                      border="1px solid"
                      borderColor="blue.200"
                      bg="white"
                      p={4}
                      mb={6}
                    >
                      <Flex direction="column" gap={4}>
                        {/* Заголовок анализа */}
                        <Flex justify="space-between" align="start">
                          <Box>
                            <Heading size="md" color="blue.900" mb={2}>
                              Анализ от {formatDate(currentAnalysis.created_at)}
                            </Heading>
                            <Text color="blue.700" fontSize="sm">
                              Ингредиентов: {currentAnalysis.ingredients_count} | 
                              Предупреждений: {currentAnalysis.warnings_count}
                            </Text>
                          </Box>
                          {currentAnalysis.image_url && (
                            <Image
                              src={currentAnalysis.image_url}
                              alt="Сохраненный анализ"
                              width="80px"
                              height="80px"
                              objectFit="cover"
                              borderRadius="md"
                              border="1px solid"
                              borderColor="blue.300"
                            />
                          )}
                        </Flex>

                        {/* Статус безопасности */}
                        <Box>
                          <Text fontWeight="bold" color="blue.800" mb={2}>
                            Статус:
                          </Text>
                          {currentAnalysis.warnings_count > 0 ? (
                            <Notification 
                              type="warning"
                              message="Обнаружены аллергены/противопоказания"
                            />
                          ) : (
                            <Notification 
                              type="success"
                              message="Безопасно"
                            />
                          )}
                        </Box>

                        {/* Ингредиенты */}
                        <Box>
                          <Text fontWeight="bold" color="blue.800" mb={2}>
                            Ингредиенты:
                          </Text>
                          <Box maxH="500px" overflowY="auto" pr={2}>
                            {currentAnalysis.analysis_result.ingredients.map((ingredient, idx) => (
                              <Flex 
                                key={idx}
                                align="center"
                                gap={3}
                                style={getIngredientStyle(ingredient)}
                              >
                                <Text>• {ingredient.name}</Text>
                                {ingredient.is_allergen && <CircleCrossIcon />}
                                {ingredient.is_contraindication && <TriangleWarningIcon />}
                              </Flex>
                            ))}
                          </Box>
                        </Box>

                        {/* Кнопки управления */}
                        <Flex gap={3} mt={4}>
                          <RefreshButton
                            onClick={() => handleReanalyzeAnalysis(currentAnalysis.id)}
                            loading={reanalyzingId === currentAnalysis.id}
                            loadingText="Перепроверка"
                            borderColor="blue.300"
                            _hover={{ borderColor: 'blue.400' }}
                          />
                          <Button
                            onClick={() => handleDeleteAnalysis(currentAnalysis.id)}
                            colorScheme="red"
                            variant="outline"
                            loading={deletingId === currentAnalysis.id}
                            loadingText="Удаление"
                            borderColor="blue.300"
                            _hover={{ borderColor: 'blue.400' }}
                          >
                            Удалить
                          </Button>
                        </Flex>
                      </Flex>
                    </Box>
                  )}
                </>
              )}
            </Box>
          </GridItem>
        </Grid>
      </Box>

      {/* Уведомления об ошибках/успехе */}
      {(error || success) && (
        <Box 
          position="fixed" 
          bottom="4" 
          right="4" 
          maxW="400px"
          zIndex={999}
        >
          {error && (
            <Notification 
              type="error"
              message={error}
              onClose={() => setError(null)}
            />
          )}
          {success && (
            <Notification 
              type="success"
              message={success}
              onClose={() => setSuccess(null)}
            />
          )}
        </Box>
      )}

      {/* Модальное окно подтверждения удаления */}
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
              Подтверждение удаления
            </Heading>
            <Text color="blue.800" mb={6}>
              Вы уверены, что хотите удалить этот анализ?
            </Text>
            <Flex gap={3} justify="flex-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setAnalysisToDelete(null);
                }}
              >
                Отмена
              </Button>
              <Button 
                colorScheme="red" 
                onClick={confirmDeleteAnalysis}
                loading={deletingId !== null}
                loadingText="Удаление"
              >
                Удалить
              </Button>
            </Flex>
          </Box>
        </Box>
      )}
    </Container>
  );
}

export default Photo;