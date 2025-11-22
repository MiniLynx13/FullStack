import React, { useState, useRef } from 'react';
import '../App.css';
import logo from '../logo.svg';
import { useAuth } from '../hooks/useAuth';
import { analyzeImage, ImageAnalysisResponse, AnalyzedIngredient } from '../services/apiService';

function Photo() {
  const { isAuth } = useAuth();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Проверяем тип файла
      if (!file.type.startsWith('image/')) {
        setError('Пожалуйста, выберите файл изображения');
        return;
      }
      
      setSelectedImage(file);
      setError(null);
      setAnalysisResult(null);
      
      // Создаем preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) {
      setError('Пожалуйста, выберите изображение');
      return;
    }

    if (!isAuth) {
      setError('Для анализа изображения необходимо авторизоваться');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await analyzeImage(selectedImage);
      setAnalysisResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка при анализе');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setPreviewUrl('');
    setAnalysisResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getIngredientStyle = (ingredient: AnalyzedIngredient) => {
    if (ingredient.is_allergen || ingredient.is_contraindication) {
      return {
        color: 'red',
        fontWeight: 'bold',
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
        padding: '2px 6px',
        borderRadius: '4px',
        margin: '2px 0'
      };
    }
    return {
      color: 'white',
      margin: '2px 0'
    };
  };

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <h3>Анализ аллергенов по фото</h3>
        
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          {!isAuth && (
            <div style={{ 
              color: 'orange', 
              marginBottom: '20px',
              padding: '10px',
              border: '1px solid orange',
              borderRadius: '4px'
            }}>
              Для анализа изображения и проверки аллергенов необходимо авторизоваться
            </div>
          )}

          {isAuth && (
          <div style={{ marginBottom: '20px' }}>
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              ref={fileInputRef}
              style={{ display: 'none' }}
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              style={{
                display: 'inline-block',
                padding: '12px 24px',
                backgroundColor: '#61dafb',
                color: '#282c34',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
            >
              Выбрать изображение
            </label>
            {selectedImage && (
              <span style={{ marginLeft: '10px', color: '#61dafb' }}>
                {selectedImage.name}
              </span>
            )}
          </div>
          )}

          {previewUrl && (
            <div style={{ marginBottom: '20px' }}>
              <img 
                src={previewUrl} 
                alt="Preview" 
                style={{ 
                  maxWidth: '300px', 
                  maxHeight: '300px',
                  border: '2px solid #61dafb',
                  borderRadius: '8px'
                }} 
              />
            </div>
          )}

          {selectedImage && (
            <div style={{ marginBottom: '20px' }}>
              <button
                onClick={handleAnalyze}
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  backgroundColor: loading ? '#ccc' : '#61dafb',
                  color: '#282c34',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginRight: '10px'
                }}
              >
                {loading ? 'Анализ...' : 'Анализировать изображение'}
              </button>
              
              <button
                onClick={handleReset}
                style={{
                  padding: '12px 24px',
                  fontSize: '16px',
                  backgroundColor: 'transparent',
                  color: '#61dafb',
                  border: '1px solid #61dafb',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Сбросить
              </button>
            </div>
          )}

          {error && (
            <div style={{ 
              color: 'red', 
              marginBottom: '20px',
              padding: '10px',
              backgroundColor: 'rgba(255, 0, 0, 0.1)',
              border: '1px solid red',
              borderRadius: '4px'
            }}>
              {error}
            </div>
          )}

          {analysisResult && (
            <div style={{ 
              textAlign: 'left',
              marginTop: '20px',
              padding: '20px',
              border: '1px solid #61dafb',
              borderRadius: '8px',
              backgroundColor: 'rgba(97, 218, 251, 0.1)'
            }}>
              <h4>Результаты анализа:</h4>
              
              <div style={{ marginBottom: '20px' }}>
                <h5>Ингредиенты:</h5>
                <div>
                  {analysisResult.ingredients.map((ingredient, index) => (
                    <div 
                      key={index} 
                      style={getIngredientStyle(ingredient)}
                    >
                      • {ingredient.name}
                      {ingredient.is_allergen && ' 🚫'}
                      {ingredient.is_contraindication && ' ⚠️'}
                    </div>
                  ))}
                </div>
              </div>

              {analysisResult.warnings.length > 0 && (
                <div style={{ 
                  color: 'red',
                  marginBottom: '20px',
                  padding: '15px',
                  backgroundColor: 'rgba(255, 0, 0, 0.1)',
                  border: '1px solid red',
                  borderRadius: '4px'
                }}>
                  <h5>Предупреждения:</h5>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {analysisResult.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {analysisResult.warnings.length === 0 && (
                <div style={{ 
                  color: 'green',
                  padding: '10px',
                  backgroundColor: 'rgba(0, 255, 0, 0.1)',
                  border: '1px solid green',
                  borderRadius: '4px'
                }}>
                  Не обнаружено аллергенов и противопоказаний
                </div>
              )}
            </div>
          )}
        </div>
      </header>
    </div>
  );
}

export default Photo;