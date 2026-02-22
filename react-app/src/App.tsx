import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Box, Flex } from '@chakra-ui/react';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Authorisation from './pages/Authorisation';
import User from './pages/User';
import Photo from './pages/Photo';
import AdminPanel from './pages/AdminPanel';
import Banned from './pages/Banned';
import Error404 from './pages/Error404';

// Защищенный маршрут для незабаненных пользователей
const UnbannedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isBanned } = useAuth();
  
  if (isBanned) {
    return <Navigate to="/banned" replace />;
  }

  return <>{children}</>;
};

// Защищенный маршрут для забаненных пользователей
const BannedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isBanned } = useAuth();
  
  if (!isBanned) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Защищенный маршрут для администраторов
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuth, isAdmin, isBanned } = useAuth();
  
  if (!isAuth) {
    return <Navigate to="/authorisation" replace />;
  }

  if (isBanned || !isAdmin) {
    return <Navigate to="/banned" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

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
            {/* Публичные маршруты */}
            <Route path="/" element={<Home />} />
            <Route path="/authorisation" element={<Authorisation />} />
            
            {/* Защищенные маршруты */}
            <Route path="/user" element={
              <UnbannedRoute>
                <User />
              </UnbannedRoute>
            } />
            <Route path="/photo" element={
              <UnbannedRoute>
                <Photo />
              </UnbannedRoute>
            } />

            <Route path="/banned" element={
              <BannedRoute>
                <Banned />
              </BannedRoute>
            } />
            
            {/* Админ-маршруты */}
            <Route path="/admin" element={
              <AdminRoute>
                <AdminPanel />
              </AdminRoute>
            } />
            
            {/* 404 */}
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