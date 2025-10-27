import React from 'react';
import './App.css';
import Home from './pages/Home';
import Authorisation from './pages/Authorisation';
import User from './pages/User';
import Calories from './pages/Calories';
import Photo from './pages/Photo';
import Error404 from './pages/Error404';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom'; // Добавляем useNavigate
import { AuthProvider, useAuth } from './hooks/useAuth';

// Компонент навигации с учетом авторизации
const Navigation: React.FC = () => {
  const { isAuth, user, logout } = useAuth();
  const navigate = useNavigate(); // Добавляем навигацию

  const handleLogout = async () => {
    try {
      await logout();
      // После выхода перенаправляем на страницу авторизации
      navigate('/authorisation');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <nav style={{ padding: '20px', borderBottom: '1px solid #ccc' }}>
      <Link to="/" style={{ marginRight: '15px' }}>Главная</Link>
      {!isAuth ? (
        <Link to="/authorisation" style={{ marginRight: '15px' }}>Авторизация</Link>
      ) : (
        <>
          <Link to="/user" style={{ marginRight: '15px' }}>Личный кабинет ({user?.username})</Link>
          <button 
            onClick={handleLogout}
            style={{
              marginRight: '15px',
              background: 'none',
              border: '1px solid #ccc',
              color: '#61dafb',
              cursor: 'pointer',
              padding: '5px 10px'
            }}
          >
            Выйти
          </button>
        </>
      )}
      <Link to="/calories" style={{ marginRight: '15px' }}>Калории</Link>
      <Link to="/photo" style={{ marginRight: '15px' }}>Аллергены по фото</Link>
    </nav>
  );
};

const AppContent: React.FC = () => {
  return (
    <Router>
      <Navigation />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/authorisation" element={<Authorisation />} />
        <Route path="/user" element={<User />} />
        <Route path="/calories" element={<Calories />} />
        <Route path="/photo" element={<Photo />} />
        <Route path="*" element={<Error404 />} />
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;