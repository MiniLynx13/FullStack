import React, { useState, useRef, useEffect, useCallback } from 'react';
import '../App.css';
import logo from '../logo.svg';
import { useAuth } from '../hooks/useAuth';
import { 
  analyzeImage, 
  ImageAnalysisResponse, 
  AnalyzedIngredient,
  saveAnalysis,
  getSavedAnalyses,
  deleteSavedAnalysis,
  reanalyzeSavedAnalysis,
  SavedAnalysis
} from '../services/apiService';

function Photo() {
  const { isAuth } = useAuth();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [reanalyzingId, setReanalyzingId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Пожалуйста, выберите файл изображения');
        return;
      }
      
      setSelectedImage(file);
      setError(null);
      setAnalysisResult(null);
      
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

  const handleSaveAnalysis = async () => {
    if (!selectedImage || !analysisResult) {
      setError('Нет результатов анализа для сохранения');
      return;
    }

    if (!isAuth) {
      setError('Для сохранения анализа необходимо авторизоваться');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await saveAnalysis(selectedImage, analysisResult);
      // Обновляем историю после сохранения
      await loadSavedAnalyses();
      window.alert('Анализ успешно сохранен!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при сохранении анализа');
    } finally {
      setSaving(false);
    }
  };

  const loadSavedAnalyses = useCallback(async () => {
    if (!isAuth) return;
    
    setHistoryLoading(true);
    try {
      const response = await getSavedAnalyses();
      setSavedAnalyses(response.analyses);
    } catch (err) {
      console.error('Ошибка загрузки истории:', err);
    } finally {
      setHistoryLoading(false);
    }
  }, [isAuth]);

  const handleDeleteAnalysis = async (id: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот анализ?')) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteSavedAnalysis(id);
      // Обновляем список после удаления
      setSavedAnalyses(savedAnalyses.filter(analysis => analysis.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при удалении анализа');
    } finally {
      setDeletingId(null);
    }
  };

  const handleReanalyzeAnalysis = async (analysisId: number) => {
    if (!isAuth) {
      setError('Для перепроверки анализа необходимо авторизоваться');
      return;
    }

    setReanalyzingId(analysisId);
    setError(null);

    try {
      const result = await reanalyzeSavedAnalysis(analysisId);
      
      // Добавляем новый анализ в начало списка
      setSavedAnalyses(prev => [result, ...prev]);
      
      window.alert('Анализ успешно перепроверен с текущими медицинскими данными!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при перепроверке анализа');
    } finally {
      setReanalyzingId(null);
    }
  };

  useEffect(() => {
    if (showHistory && isAuth) {
      loadSavedAnalyses();
    }
  }, [showHistory, isAuth, loadSavedAnalyses]);

  const handleReset = () => {
    setSelectedImage(null);
    setPreviewUrl('');
    setAnalysisResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleHistory = () => {
    setShowHistory(!showHistory);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <h3>Анализ аллергенов по фото</h3>
        
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
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

          {/* История анализов */}
          {isAuth && (
            <div style={{ marginBottom: '20px', textAlign: 'left' }}>
              <button
                onClick={toggleHistory}
                style={{
                  padding: '10px 20px',
                  backgroundColor: showHistory ? '#61dafb' : 'transparent',
                  color: showHistory ? '#282c34' : '#61dafb',
                  border: '1px solid #61dafb',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  marginBottom: '10px'
                }}
              >
                {showHistory ? 'Скрыть историю' : 'Показать историю анализов'} 
                {savedAnalyses.length > 0 && ` (${savedAnalyses.length})`}
              </button>

              {showHistory && (
                <div style={{ 
                  marginTop: '20px',
                  padding: '20px',
                  border: '1px solid #61dafb',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(97, 218, 251, 0.05)'
                }}>
                  <h4 style={{ marginBottom: '15px', color: '#61dafb' }}>История анализов</h4>
                  
                  {historyLoading ? (
                    <div style={{ color: '#61dafb', textAlign: 'center', padding: '20px' }}>
                      Загрузка истории...
                    </div>
                  ) : savedAnalyses.length === 0 ? (
                    <div style={{ color: '#ccc', textAlign: 'center', padding: '20px' }}>
                      История анализов пуста. Проанализируйте и сохраните первый анализ!
                    </div>
                  ) : (
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      {savedAnalyses.map((analysis) => (
                        <div 
                          key={analysis.id}
                          style={{
                            marginBottom: '15px',
                            padding: '15px',
                            border: '1px solid rgba(97, 218, 251, 0.3)',
                            borderRadius: '6px',
                            backgroundColor: analysis.is_reanalysis 
                              ? 'rgba(97, 218, 251, 0.15)' 
                              : 'rgba(97, 218, 251, 0.1)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                marginBottom: '10px',
                                gap: '10px'
                              }}>
                                {analysis.image_url && (
                                  <img 
                                    src={analysis.image_url} 
                                    alt="Сохраненный анализ"
                                    style={{
                                      width: '80px',
                                      height: '80px',
                                      objectFit: 'cover',
                                      borderRadius: '4px',
                                      border: '1px solid #61dafb'
                                    }}
                                  />
                                )}
                                <div>
                                  <div style={{ color: '#61dafb', fontWeight: 'bold' }}>
                                    Анализ от {formatDate(analysis.created_at)}
                                    {analysis.is_reanalysis && (
                                      <span style={{ 
                                        fontSize: '12px', 
                                        color: '#61dafb', 
                                        fontStyle: 'italic',
                                        marginLeft: '10px'
                                      }}>
                                        🔄 Перепроверено
                                      </span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: '14px', color: '#ccc', marginTop: '5px' }}>
                                    Ингредиентов: {analysis.ingredients_count} | 
                                    Предупреждений: {analysis.warnings_count}
                                    {analysis.original_analysis_id && (
                                      <span style={{ marginLeft: '10px', fontSize: '12px', color: '#999' }}>
                                        Копия анализа #{analysis.original_analysis_id}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              <div style={{ marginTop: '10px' }}>
                                <div style={{ 
                                  color: analysis.warnings_count > 0 ? 'red' : 'green',
                                  fontSize: '14px',
                                  fontWeight: 'bold',
                                  marginBottom: '5px'
                                }}>
                                  {analysis.warnings_count > 0 
                                    ? '⚠️ Обнаружены аллергены/противопоказания' 
                                    : '✓ Безопасно'}
                                </div>
                                
                                <div style={{ maxHeight: '100px', overflowY: 'auto', marginBottom: '10px' }}>
                                  {analysis.analysis_result.ingredients.slice(0, 5).map((ingredient, idx) => (
                                    <div 
                                      key={idx}
                                      style={getIngredientStyle(ingredient)}
                                    >
                                      • {ingredient.name}
                                      {ingredient.is_allergen && ' 🚫'}
                                      {ingredient.is_contraindication && ' ⚠️'}
                                    </div>
                                  ))}
                                  {analysis.analysis_result.ingredients.length > 5 && (
                                    <div style={{ color: '#ccc', fontSize: '12px', marginTop: '5px' }}>
                                      ... и еще {analysis.analysis_result.ingredients.length - 5} ингредиентов
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Кнопки управления */}
                              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                <button
                                  onClick={() => handleReanalyzeAnalysis(analysis.id)}
                                  disabled={reanalyzingId === analysis.id}
                                  style={{
                                    padding: '5px 10px',
                                    backgroundColor: reanalyzingId === analysis.id ? '#ccc' : 'rgba(97, 218, 251, 0.2)',
                                    color: '#61dafb',
                                    border: '1px solid #61dafb',
                                    borderRadius: '4px',
                                    cursor: reanalyzingId === analysis.id ? 'not-allowed' : 'pointer',
                                    fontSize: '12px',
                                    flex: 1
                                  }}
                                >
                                  {reanalyzingId === analysis.id ? 'Перепроверка...' : '🔄 Перепроверить с текущими медицинскими данными'}
                                </button>
                                
                                <button
                                  onClick={() => handleDeleteAnalysis(analysis.id)}
                                  disabled={deletingId === analysis.id}
                                  style={{
                                    padding: '5px 10px',
                                    backgroundColor: deletingId === analysis.id ? '#ccc' : 'rgba(255, 0, 0, 0.2)',
                                    color: 'red',
                                    border: '1px solid red',
                                    borderRadius: '4px',
                                    cursor: deletingId === analysis.id ? 'not-allowed' : 'pointer',
                                    fontSize: '12px',
                                    minWidth: '80px'
                                  }}
                                >
                                  {deletingId === analysis.id ? 'Удаление...' : 'Удалить'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Основной интерфейс анализа */}
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
                  borderRadius: '4px',
                  marginBottom: '15px'
                }}>
                  Не обнаружено аллергенов и противопоказаний
                </div>
              )}

              {/* Кнопка сохранения */}
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button
                  onClick={handleSaveAnalysis}
                  disabled={saving}
                  style={{
                    padding: '12px 24px',
                    fontSize: '16px',
                    backgroundColor: saving ? '#ccc' : '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? 'Сохранение...' : '💾 Сохранить результат'}
                </button>
                <div style={{ fontSize: '12px', color: '#ccc', marginTop: '5px' }}>
                  Результат будет сохранен в вашей истории
                </div>
              </div>
            </div>
          )}
        </div>
      </header>
    </div>
  );
}

export default Photo;