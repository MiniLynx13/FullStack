import React from 'react';
import './App.css';
import Home from './pages/Home';
import Authorisation from './pages/Authorisation';
import User from './pages/User';
import Calories from './pages/Calories';
import Photo from './pages/Photo';
import Error404 from './pages/Error404';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

const App: React.FC = () => {
  return (
    <Router>
      <nav style={{ padding: '20px', borderBottom: '1px solid #ccc' }}>
        <Link to="/" style={{ marginRight: '15px' }}>Главная</Link>
        <Link to="/authorisation" style={{ marginRight: '15px' }}>Авторизация</Link>
        <Link to="/user" style={{ marginRight: '15px' }}>Пользователь</Link>
        <Link to="/calories" style={{ marginRight: '15px' }}>Калории</Link>
        <Link to="/photo" style={{ marginRight: '15px' }}>Аллергены по фото</Link>
      </nav>

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
}

export default App;
