import React from 'react';
import { Box, Text, Grid, GridItem, Flex, Link } from '@chakra-ui/react';

// Иконка конверта (SVG)
const EmailIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ color: '#2563eb' }}
  >
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
    <polyline points="22,6 12,13 2,6"></polyline>
  </svg>
);

// Иконка GitHub (SVG)
const GitHubIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ color: '#2563eb' }}
  >
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
  </svg>
);

const Footer: React.FC = () => {
  return (
    <Box 
      as="footer" 
      bg="blue.50" 
      color="blue.900" 
      py={6}
      px={6}
      mt="auto"
      borderTop="1px solid"
      borderColor="blue.100"
    >
      <Grid 
        templateColumns={{ base: "1fr", md: "1fr 1fr" }} 
        gap={{ base: 6, md: 16 }}
        maxW="1200px" 
        mx="auto"
        justifyContent="space-between"
      >
        {/* Связь с нами */}
        <GridItem>
          <Flex direction="column" gap={2} align={{ base: "center", md: "flex-start" }}>
            <Flex align="center" gap={3}>
              <EmailIcon />
              <Text fontSize="xl" fontWeight="bold" color="blue.900">
                Связь с нами
              </Text>
            </Flex>
            
            <Text 
              color="blue.800" 
              fontSize="md" 
              textAlign={{ base: "center", md: "left" }}
              whiteSpace="nowrap"
            >
              Есть вопросы или предложения? Напишите нам!
            </Text>
            
            <Link
              href="https://mail.google.com/mail/?view=cm&fs=1&to=mlywer8357@gmail.com&su=Вопрос%20по%20проекту%20AllergyDetect"
              target="_blank"
              rel="noopener noreferrer"
              color="blue.800"
              fontSize="lg"
              fontWeight="medium"
              _hover={{ color: 'blue.600' }}
              transition="color 0.2s"
              textDecoration="none"
            >
              mlywer8357@gmail.com
            </Link>
          </Flex>
        </GridItem>
        
        {/* О проекте */}
        <GridItem>
          <Flex direction="column" gap={2} align={{ base: "center", md: "flex-end" }}>
            <Flex align="center" gap={3}>
              <GitHubIcon />
              <Text fontSize="xl" fontWeight="bold" color="blue.900">
                О проекте
              </Text>
            </Flex>
            
            <Text 
              color="blue.800" 
              fontSize="md" 
              textAlign={{ base: "center", md: "right" }}
              whiteSpace="nowrap"
            >
              Открытый проект для определения аллергенов по фотографиям продуктов
            </Text>
            
            <Link 
              href="https://github.com/MiniLynx13/FullStack"
              target="_blank"
              rel="noopener noreferrer"
              color="blue.800"
              fontSize="lg"
              fontWeight="medium"
              _hover={{ color: 'blue.600' }}
              transition="color 0.2s"
              textDecoration="none"
            >
              GitHub репозиторий
            </Link>
          </Flex>
        </GridItem>
      </Grid>
      
      {/* Копирайт */}
      <Box 
        borderTop="1px solid" 
        borderColor="blue.200" 
        mt={6}
        pt={4}
        textAlign="center"
      >
        <Text color="blue.800" fontSize="sm">
          © {new Date().getFullYear()} AllergyDetect. Все права защищены.
        </Text>
      </Box>
    </Box>
  );
};

export default Footer;