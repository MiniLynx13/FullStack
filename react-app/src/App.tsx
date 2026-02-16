import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { Box, Flex } from '@chakra-ui/react';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Authorisation from './pages/Authorisation';
import User from './pages/User';
import Photo from './pages/Photo';
import Error404 from './pages/Error404';
import { ProtectedRoute } from './components/ProtectedRoute';

const AppContent: React.FC = () => {
  return (
    <Router>
      <Flex direction="column" minH="100vh">
        <Header />
        <Box 
          as="main" 
          flex="1" 
          py={2}
          style={{
            background: `
              linear-gradient(135deg, 
                #dbeafe 0%, 
                #dbeafe 25%, 
                #bfdbfe 25%, 
                #bfdbfe 50%, 
                #93c5fd 50%, 
                #93c5fd 75%, 
                #60a5fa 75%, 
                #60a5fa 100%
            )`,
            backgroundSize: '400% 400%',
            animation: 'gradient 15s ease infinite'
          }}
        >
          <style>
            {`
              @keyframes gradient {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
              }
            `}
          </style>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/authorisation" element={<Authorisation />} />
            <Route path="/user" element={<User />} />
            <Route path="/photo" element={
              <ProtectedRoute> {/* Доступно всем */}
                <Photo />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Error404 />} />
          </Routes>
        </Box>
        <Footer />
      </Flex>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;