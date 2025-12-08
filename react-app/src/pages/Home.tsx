import React from 'react';
import { Container, Heading, Text, Button, Grid, GridItem, Box, Image } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import Present from '../Present.png';

function Home() {
  const navigate = useNavigate();

  return (
    <Container 
      maxW="1200px" 
      p={0} 
      bg="transparent"
      display="flex"
      alignItems="center"
      minH="calc(100vh - 200px)"
    >
      <Box
        position="relative"
        overflow="hidden"
        borderRadius="xl"
        bg="transparent"
        width="100%"
      >
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={8} p={8} position="relative" zIndex={1}>
          {/* Текстовая часть */}
          <GridItem display="flex" alignItems="center">
            <Box 
              py={8}
              px={6}
              borderRadius="xl"
              bg="#eff6ff50"
            >
              <Heading 
                as="h1" 
                size="2xl" 
                color="blue.900"
                mb={4}
                textAlign="left"
              >
                Добро пожаловать в AllergyDetect
              </Heading>
              <Text 
                fontSize="xl" 
                color="blue.800"
                mb={2}
                textAlign="left"
              >
                Определение аллергенов по фото
              </Text>
              <Text 
                fontSize="xl" 
                color="blue.800"
                mb={2}
                textAlign="left"
              >
                История ваших анализов блюд
              </Text>
              <Text 
                fontSize="xl" 
                color="blue.800"
                mb={2}
                textAlign="left"
              >
                Персонализированные рекомендации
              </Text>
              <Text 
                fontSize="xl" 
                color="blue.800"
                mb={8}
                textAlign="left"
              >
                Безопасное хранение данных
              </Text>
              <Button
                onClick={() => navigate('/photo')}
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
              >
                Начать анализ
              </Button>
            </Box>
          </GridItem>

          {/* Изображение */}
          <GridItem display="flex" alignItems="center" justifyContent="center">
            <Image
              src={Present}
              alt="Аллергены в продуктах"
              borderRadius="xl"
              boxShadow="xl"
              maxH="580px"
              width="100%"
              objectFit="cover"
            />
          </GridItem>
        </Grid>
      </Box>
    </Container>
  );
}

export default Home;