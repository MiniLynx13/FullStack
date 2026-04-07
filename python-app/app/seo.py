# app/seo.py
from fastapi import APIRouter, Request
from fastapi.responses import PlainTextResponse
from datetime import datetime
from .config import IS_PRODUCTION, BASE_URL

router = APIRouter(tags=["seo"])

@router.get("/robots.txt")
async def robots_txt(request: Request):
    """robots.txt для поисковых роботов"""
    if IS_PRODUCTION:
        sitemap_url = f"{BASE_URL}/sitemap.xml"
    else:
        sitemap_url = f"{str(request.base_url).rstrip('/')}/sitemap.xml"
    
    content = f"""User-agent: *
Allow: /
Disallow: /authorisation
Disallow: /admin
Disallow: /user
Disallow: /photo
Disallow: /banned

Sitemap: {sitemap_url}
"""
    return PlainTextResponse(content, media_type="text/plain")

@router.get("/sitemap.xml")
async def sitemap_xml(request: Request):
    """sitemap.xml для индексации"""
    if IS_PRODUCTION:
        base_url = BASE_URL
    else:
        base_url = str(request.base_url).rstrip('/')
    
    public_pages = [
        {"loc": "/", "priority": "1.0", "changefreq": "weekly"},
    ]
    
    sitemap = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
"""
    for page in public_pages:
        sitemap += f"""
  <url>
    <loc>{base_url}{page['loc']}</loc>
    <lastmod>{datetime.now().date().isoformat()}</lastmod>
    <changefreq>{page['changefreq']}</changefreq>
    <priority>{page['priority']}</priority>
  </url>"""
    
    sitemap += "\n</urlset>"
    return PlainTextResponse(sitemap, media_type="application/xml")

@router.get("/api/schema/organization")
async def organization_schema(request: Request):
    """JSON-LD для организации"""
    if IS_PRODUCTION:
        base_url = BASE_URL
    else:
        base_url = str(request.base_url).rstrip('/')
    
    schema = {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        "name": "AllergyDetect",
        "description": "Определение ингредиентов по фотографии продуктов, выявление аллергенов и сигнализирование о медицинских противопоказаниях.",
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
    return schema