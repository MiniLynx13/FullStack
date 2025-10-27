import React, { useState, useEffect } from 'react';
import '../App.css';
import logo from '../logo.svg';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

function Authorisation() {
  const { login, register, loading: authLoading, error: authError, clearError, isAuth } = useAuth();
  const navigate = useNavigate();
  
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [localError, setLocalError] = useState<string | null>(null);

  // Переадресация при успешной авторизации
  useEffect(() => {
    if (isAuth) {
      navigate('/user');
    }
  }, [isAuth, navigate]);

  // Очищаем ошибки при смене режима формы
  useEffect(() => {
    clearError();
    setLocalError(null);
  }, [isLogin]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Очищаем только локальные ошибки при изменении
    if (localError) {
      setLocalError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Валидация
    if (!formData.username.trim() || !formData.password.trim()) {
      setLocalError('Заполните все обязательные поля');
      return;
    }

    if (!isLogin) {
      if (!formData.email.trim()) {
        setLocalError('Email обязателен для регистрации');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setLocalError('Пароли не совпадают');
        return;
      }
      if (formData.password.length < 6) {
        setLocalError('Пароль должен содержать минимум 6 символов');
        return;
      }
    }

    try {
      if (isLogin) {
        await login({
          username: formData.username,
          password: formData.password
        });
      } else {
        await register({
          username: formData.username,
          email: formData.email,
          password: formData.password
        });
      }
    } catch (err) {
      console.error('Auth error in component:', err);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: ''
    });
    setLocalError(null);
    clearError(); // Очищаем ошибки только при смене режима
  };

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <h3>{isLogin ? 'Вход' : 'Регистрация'}</h3>
        
        <div style={{ maxWidth: '400px', margin: '0 auto' }}>
          <div style={{ marginBottom: '20px' }}>
            <button 
              onClick={() => setIsLogin(true)}
              style={{
                marginRight: '10px',
                backgroundColor: isLogin ? '#61dafb' : 'transparent',
                color: isLogin ? '#282c34' : '#61dafb',
                border: '1px solid #61dafb',
                padding: '10px 20px',
                cursor: 'pointer',
                borderRadius: '4px'
              }}
            >
              Вход
            </button>
            <button 
              onClick={() => setIsLogin(false)}
              style={{
                backgroundColor: !isLogin ? '#61dafb' : 'transparent',
                color: !isLogin ? '#282c34' : '#61dafb',
                border: '1px solid #61dafb',
                padding: '10px 20px',
                cursor: 'pointer',
                borderRadius: '4px'
              }}
            >
              Регистрация
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '15px' }}>
              <input
                type="text"
                name="username"
                placeholder="Имя пользователя"
                value={formData.username}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '16px',
                  border: (localError || authError) ? '1px solid red' : '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {!isLogin && (
              <div style={{ marginBottom: '15px' }}>
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '16px',
                    border: (localError || authError) ? '1px solid red' : '1px solid #ccc',
                    borderRadius: '4px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: '15px' }}>
              <input
                type="password"
                name="password"
                placeholder="Пароль"
                value={formData.password}
                onChange={handleChange}
                required
                style={{
                  width: '100%',
                  padding: '10px',
                  fontSize: '16px',
                  border: (localError || authError) ? '1px solid red' : '1px solid #ccc',
                  borderRadius: '4px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {!isLogin && (
              <div style={{ marginBottom: '15px' }}>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Подтвердите пароль"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '10px',
                    fontSize: '16px',
                    border: localError && localError.includes('Пароли не совпадают') ? '1px solid red' : '1px solid #ccc',
                    borderRadius: '4px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}

            {/* Ошибки локальной валидации */}
            {localError && (
              <div style={{ 
                color: 'red', 
                marginBottom: '15px', 
                padding: '10px',
                backgroundColor: 'rgba(255, 0, 0, 0.1)',
                borderRadius: '4px',
                border: '1px solid red',
                fontSize: '14px'
              }}>
                {localError}
              </div>
            )}

            {/* Ошибки от сервера */}
            {authError && (
              <div style={{ 
                color: 'red', 
                marginBottom: '15px', 
                padding: '10px',
                backgroundColor: 'rgba(255, 0, 0, 0.1)',
                borderRadius: '4px',
                border: '1px solid red',
                fontSize: '14px'
              }}>
                {authError}
                <button 
                  onClick={clearError}
                  style={{
                    marginLeft: '10px',
                    background: 'none',
                    border: 'none',
                    color: 'red',
                    cursor: 'pointer',
                    float: 'right'
                  }}
                >
                  ×
                </button>
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                backgroundColor: '#61dafb',
                color: '#282c34',
                border: 'none',
                borderRadius: '4px',
                cursor: authLoading ? 'not-allowed' : 'pointer',
                opacity: authLoading ? 0.7 : 1
              }}
            >
              {authLoading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Зарегистрироваться')}
            </button>
          </form>

          <div style={{ marginTop: '15px', textAlign: 'center' }}>
            <button
              onClick={switchMode}
              style={{
                background: 'none',
                border: 'none',
                color: '#61dafb',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {isLogin ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
            </button>
          </div>
        </div>
      </header>
    </div>
  );
}

export default Authorisation;