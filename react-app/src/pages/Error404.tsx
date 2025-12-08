import React from 'react';
import { Container, Box, Heading, Text, Button } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';

function Error404() {
  const navigate = useNavigate();

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
        bg="#eff6ff50"
        boxShadow="lg"
        textAlign="center"
      >
        <Box display="flex" flexDirection="column" gap={6} width="100%">
          <Box>
            <Heading as="h1" size="4xl" color="blue.900" mb={6}>
              Error 404
            </Heading>
            
            <Text 
              fontSize="xl" 
              color="blue.800"
              mb={4}
              fontWeight="medium"
            >
              Такой страницы не существует
            </Text>
            
            <Text 
              fontSize="lg" 
              color="blue.800"
              mb={8}
            >
              Она была удалена или перенесена
            </Text>
          </Box>

          <Button
            onClick={() => navigate('/')}
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
            width="fit-content"
            mx="auto"
            px={8}
          >
            Вернуться на Главную
          </Button>
        </Box>
      </Box>
    </Container>
  );
}

export default Error404;