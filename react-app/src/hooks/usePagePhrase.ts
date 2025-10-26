import { useState, useEffect } from 'react';
import { getPagePhrase, checkBackendConnection } from '../services/apiService';

export const usePagePhrase = (pageName: string) => {
  const [phrase, setPhrase] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPhrase = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log(`Starting to fetch phrase for: ${pageName}`);
        
        // Проверяем доступность бэкенда
        const isBackendAlive = await checkBackendConnection();
        if (!isBackendAlive) {
          throw new Error('Бэкенд недоступен. Проверьте, запущен ли FastAPI сервер на порту 8000');
        }
        
        console.log('Backend is alive, fetching phrase...');
        const pagePhrase = await getPagePhrase(pageName);
        setPhrase(pagePhrase);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Неизвестная ошибка';
        setError(errorMessage);
        console.error('Error in usePagePhrase:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPhrase();
  }, [pageName]);

  return { phrase, loading, error };
};