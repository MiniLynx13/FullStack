import React, { useState, useEffect } from 'react';
import '../App.css';
import logo from '../logo.svg';
import { useAuth } from '../hooks/useAuth';
import { getMedicalData, saveMedicalData, MedicalData } from '../services/apiService';
import { useNavigate } from 'react-router-dom'; // Добавляем useNavigate

function User() {
  const { user, logout, isAuth, error: authError, clearError } = useAuth();
  const navigate = useNavigate(); // Добавляем навигацию
  
  const [medicalData, setMedicalData] = useState<MedicalData>({
    contraindications: '',
    allergens: ''
  });
  const [savedData, setSavedData] = useState<MedicalData>({
    contraindications: '',
    allergens: ''
  });
  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Загрузка медицинских данных при монтировании компонента
  useEffect(() => {
    if (isAuth) {
      loadMedicalData();
    }
  }, [isAuth]);

  const loadMedicalData = async () => {
    try {
      setLoading(true);
      const data = await getMedicalData();
      setMedicalData({
        contraindications: data.contraindications || '',
        allergens: data.allergens || ''
      });
      setSavedData({
        contraindications: data.contraindications || '',
        allergens: data.allergens || ''
      });
    } catch (error) {
      console.error('Error loading medical data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      // После успешного выхода перенаправляем на страницу авторизации
      navigate('/authorisation');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleMedicalChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMedicalData({
      ...medicalData,
      [e.target.name]: e.target.value
    });
    // Сбрасываем сообщение об успешном сохранении при изменении данных
    if (saveMessage) setSaveMessage(null);
  };

  const handleSaveMedical = async () => {
    try {
      setLoading(true);
      setSaveMessage(null);
      await saveMedicalData(medicalData);
      setSavedData(medicalData);
      setSaveMessage('Медицинские данные успешно сохранены!');
      
      // Автоматически скрываем сообщение через 3 секунды
      setTimeout(() => {
        setSaveMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Error saving medical data:', error);
      setSaveMessage('Ошибка сохранения медицинских данных');
    } finally {
      setLoading(false);
    }
  };

  // Проверяем, изменились ли данные
  const hasChanges = 
    medicalData.contraindications !== savedData.contraindications ||
    medicalData.allergens !== savedData.allergens;

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

          {saveMessage && (
            <div style={{ 
              color: saveMessage.includes('Ошибка') ? 'red' : 'green',
              marginBottom: '15px', 
              padding: '10px',
              backgroundColor: saveMessage.includes('Ошибка') ? 'rgba(255, 0, 0, 0.1)' : 'rgba(0, 255, 0, 0.1)',
              borderRadius: '4px',
              border: saveMessage.includes('Ошибка') ? '1px solid red' : '1px solid green'
            }}>
              {saveMessage}
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
              disabled={loading || !hasChanges}
              style={{
                padding: '10px 20px',
                backgroundColor: hasChanges ? '#61dafb' : '#ccc',
                color: '#282c34',
                border: 'none',
                borderRadius: '4px',
                cursor: hasChanges && !loading ? 'pointer' : 'not-allowed',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Сохранение...' : 'Сохранить медицинские данные'}
            </button>
            {!hasChanges && (
              <p style={{ color: '#61dafb', fontSize: '14px', marginTop: '10px' }}>
                Все изменения сохранены
              </p>
            )}
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