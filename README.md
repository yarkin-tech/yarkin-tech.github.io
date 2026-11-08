# YARKIN — сайт на Astro

Сборка, ремонт и настройка ПК, сайты и локальный ИИ — https://yarkin-tech.github.io

## Технологии

- [Astro](https://astro.build) 7.x (статическая генерация, SSG)
- `@astrojs/sitemap` — автоматический sitemap (`sitemap-index.xml`)
- Деплой — GitHub Pages через GitHub Actions (`.github/workflows/deploy.yml`)

## Структура

- `src/pages/` — маршруты сайта (главная, услуги, блог, CRM, железо и т.д.)
- `src/components/` — переиспользуемые компоненты
- `src/layouts/BaseLayout.astro` — общий каркас страниц (head, шапка, подвал)
- `src/content/blog/` — статьи блога в Markdown (content collections)
- `public/` — статика, копируется в корень сборки как есть (favicons, изображения)
- `.github/workflows/deploy.yml` — CI: сборка (Node 22) + деплой на Pages

> Раньше в корне лежали legacy-страницы на чистом HTML (`index.html`, `css/`, `js/` и т.п.).
> Сайт полностью мигрирован на Astro, legacy удалён из репозитория.

## Команды

```bash
npm install      # установка зависимостей
npm run dev      # локальная разработка (http://localhost:4321)
npm run build    # прод-сборка в dist/
npm run preview  # предпросмотр прод-сборки
```

## Деплой

Каждый push в `main` автоматически запускает воркфлоу «Deploy Astro Site to Pages»:
сборка через `withastro/action@v4` и публикация `dist/` на GitHub Pages.
Требуется Node.js ≥ 22.23.4 (закреплено в CI).

Требования к репозиторию (Settings → Pages): **Source: GitHub Actions**.
