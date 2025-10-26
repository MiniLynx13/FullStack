import React, { useState } from 'react';
import '../App.css';
import logo from '../logo.svg';
import { useAuth } from '../hooks/useAuth';

function User() {
  const { user, logout, isAuth, error: authError, clearError } = useAuth();
  const [medicalData, setMedicalData] = useState({
    contraindications: '',
    allergens: ''
  });

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleMedicalChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMedicalData({
      ...medicalData,
      [e.target.name]: e.target.value
    });
  };

  const handleSaveMedical = () => {
    // Здесь будет логика сохранения медицинских данных
    alert('Медицинские данные сохранены!');
  };

  if (!isAuth) {
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h3>Пользователь</h3>
          <p>Пожалуйста, войдите в систему чтобы просмотреть эту страницу</p>
        </header>
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        
        <div style={{ textAlign: 'left', maxWidth: '500px', margin: '0 auto' }}>
          <h3>Личный кабинет</h3>
          
          {authError && (
            <div style={{ 
              color: 'red', 
              marginBottom: '15px', 
              padding: '10px',
              backgroundColor: 'rgba(255, 0, 0, 0.1)',
              borderRadius: '4px',
              border: '1px solid red'
            }}>
              {authError}
              <button 
                onClick={clearError}
                style={{
                  marginLeft: '10px',
                  background: 'none',
                  border: 'none',
                  color: 'red',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>
          )}
          
          <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #61dafb', borderRadius: '8px' }}>
            <h4>Информация о пользователе</h4>
            <p><strong>Имя пользователя:</strong> {user?.username}</p>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Дата регистрации:</strong> {user?.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : 'Неизвестно'}</p>
          </div>

          <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #61dafb', borderRadius: '8px' }}>
            <h4>Медицинские противопоказания</h4>
            <textarea
              name="contraindications"
              placeholder="Укажите ваши медицинские противопоказания..."
              value={medicalData.contraindications}
              onChange={handleMedicalChange}
              rows={4}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box',
                marginBottom: '10px'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px', padding: '20px', border: '1px solid #61dafb', borderRadius: '8px' }}>
            <h4>Аллергены</h4>
            <textarea
              name="allergens"
              placeholder="Укажите ваши аллергены..."
              value={medicalData.allergens}
              onChange={handleMedicalChange}
              rows={4}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '14px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                boxSizing: 'border-box',
                marginBottom: '10px'
              }}
            />
            <button
              onClick={handleSaveMedical}
              style={{
                padding: '10px 20px',
                backgroundColor: '#61dafb',
                color: '#282c34',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Сохранить медицинские данные
            </button>
          </div>

          <button
            onClick={handleLogout}
            style={{
              padding: '10px 20px',
              backgroundColor: '#ff4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Выйти
          </button>
        </div>
      </header>
    </div>
  );
}

export default User;