const API_BASE_URL = 'http://localhost:8000';

export interface PhraseResponse {
  phrase: string;
}

export const getPagePhrase = async (pageName: string): Promise<string> => {
  try {
    console.log(`Fetching phrase for page: ${pageName}`);
    
    // Маппинг имен страниц на URL эндпоинты
    const pageToEndpoint: { [key: string]: string } = {
      'home': '/',
      'user': '/user', 
      'authorisation': '/authorisation',
      'photo': '/photo',
      'calories': '/calories'
    };
    
    const endpoint = pageToEndpoint[pageName];
    if (!endpoint) {
      throw new Error(`Неизвестная страница: ${pageName}`);
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Если бэкенд возвращает JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data: PhraseResponse = await response.json();
      return data.phrase;
    } else {
      // Если бэкенд возвращает просто текст
      const text = await response.text();
      return text;
    }
    
  } catch (error) {
    console.error('Error fetching phrase:', error);
    return 'Не удалось загрузить фразу для этой страницы';
  }
};

export const checkBackendConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE_URL}/`);
    return response.ok;
  } catch (error) {
    console.error('Backend connection failed:', error);
    return false;
  }
};