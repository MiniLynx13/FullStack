import json
from fastapi import Request

def get_organization_schema(request: Request) -> str:
    """JSON-LD для организации"""
    base_url = str(request.base_url).rstrip('/')
    
    schema = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "AllergyDetect",
        "description": "Определение аллергенов по фотографии продуктов",
        "url": base_url,
        "applicationCategory": "Health & Wellness",
        "operatingSystem": "Web",
        "offers": {
            "@type": "Offer",
            "price": "0",
            "priceCurrency": "RUB"
        },
        "featureList": [
            "Определение аллергенов по фото",
            "Хранение истории анализов",
            "Персонализированные рекомендации"
        ]
    }
    return json.dumps(schema, ensure_ascii=False)

def get_webpage_schema(title: str, description: str, url: str) -> str:
    """JSON-LD для веб-страницы"""
    schema = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "name": title,
        "description": description,
        "url": url
    }
    return json.dumps(schema, ensure_ascii=False)