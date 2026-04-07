import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  noindex?: boolean;
  keywords?: string;
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

const defaultImage = '/logo512.png';
const siteName = 'AllergyDetect';
const defaultAuthor = 'Morozova Olga';

export const SEO = ({ 
  title, 
  description, 
  canonical, 
  ogImage = defaultImage, 
  noindex = false,
  keywords = 'аллергены, анализ продуктов, определение аллергенов, здоровое питание, медицинские противопоказания, ингредиенты, определение ингредиентов',
  author = defaultAuthor
}: SEOProps) => {
  const fullTitle = title === siteName ? siteName : `${title} | ${siteName}`;
  const url = canonical || `https://allergydetect.com${window.location.pathname}`;
  
  // Определяем robots content
  const robotsContent = noindex ? 'noindex, nofollow' : 'index, follow';
  
  return (
    <Helmet>
      {/* Базовые мета-теги */}
      <html lang="ru" />
      <meta charSet="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      <meta httpEquiv="Content-Language" content="ru" />
      
      {/* Title и Description */}
      <title>{fullTitle}</title>
      <meta name="description" content={description.slice(0, 200)} />
      <meta name="keywords" content={keywords} />
      
      {/* Роботы */}
      <meta name="robots" content={robotsContent} />
      <meta name="googlebot" content={robotsContent} />
      <meta name="yandex" content={robotsContent} />
      <meta name="bingbot" content={robotsContent} />
      
      {/* Canonical */}
      <link rel="canonical" href={url} />
      
      {/* Referrer */}
      <meta name="referrer" content="strict-origin-when-cross-origin" />
      
      {/* Автор и копирайт */}
      <meta name="author" content={author} />
      <meta name="copyright" content={`${siteName}, ${new Date().getFullYear()}`} />
      
      {/* PWA */}
      <meta name="application-name" content={siteName} />
      <meta name="mobile-web-app-capable" content="no" />
      <link rel="manifest" href="/manifest.json" />
      
      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description.slice(0, 200)} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="512" />
      <meta property="og:image:height" content="512" />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="ru_RU" />
      <meta property="og:locale:alternate" content="en_US" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description.slice(0, 200)} />
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content="@allergydetect" />
      <meta name="twitter:creator" content="@allergydetect" />
    </Helmet>
  );
};