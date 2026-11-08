/**
 * Шаг 5.3: перенос блога из blog/*.html старого сайта в Astro.
 * Детерминированно: тела статей и карточки индекса извлекаются из исходников.
 * Запуск: node scripts/migrate-blog.cjs
 */
const fs = require('fs');
const path = require('path');

const SRC = 'blog';
const OUT_CONTENT = 'src/content/blog';
const OUT_REDIRECTS = 'public/blog';

fs.mkdirSync(OUT_CONTENT, { recursive: true });
fs.mkdirSync(OUT_REDIRECTS, { recursive: true });

const read = (p) => fs.readFileSync(p, 'utf8');

function extract(re, src, label, file) {
  const m = src.match(re);
  if (!m) throw new Error('Не найдено: ' + label + ' в ' + file);
  return m[1].trim();
}

function jsonld(src, file) {
  const m = src.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if (!m) throw new Error('Нет JSON-LD в ' + file);
  return JSON.parse(m[1]);
}

const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.html'));
const manifest = [];

for (const file of files) {
  const src = read(path.join(SRC, file));
  const slug = file.replace(/\.html$/, '');

  const title = extract(/<title>([^<]+)<\/title>/, src, 'title', file);
  const desc = extract(/name="description" content="([^"]*)"/, src, 'description', file);
  const ld = jsonld(src, file);
  const date = ld.datePublished;

  // Тело статьи: содержимое .blog-article-body (1:1, включая опечатки)
  const bodyM = src.match(/<article class="blog-article-body card">([\s\S]*?)<\/article>/);
  if (!bodyM) throw new Error('Нет .blog-article-body в ' + file);
  // Дедент: исходный HTML имеет отступы, markdown превратил бы их в код-блоки.
  // Убираем только ведущие пробелы строк — контент и структура тегов не меняются.
  let body = bodyM[1]
    .split('\n')
    .map((l) => l.replace(/^\s+/, ''))
    .join('\n')
    .trim();

  // Переписываем внутренние ссылки на статьи: blog/x.html -> /blog/x/
  body = body.replace(/href="blog\/([a-z0-9-]+)\.html"/g, 'href="/blog/$1/"');
  // Ссылки на старые страницы сайта -> абсолютные пути Astro
  body = body.replace(/href="(?:\.\.\/)?(index|services|about|contact|privacy|web)\.html"/g, 'href="/$1/"');
  // Относительные img -> абсолютные
  body = body.replace(/src="(?:\.\.\/)?img\//g, 'src="/img/');

  // CTA-секция статьи (после текста), ссылки -> абсолютные
  const ctaM = src.match(/<!-- ===== CTA ===== -->\s*<section class="cta-section[^"]*">([\s\S]*?)<\/section>/);
  let cta = null;
  if (ctaM) {
    cta = ctaM[1]
      .replace(/href="(?:\.\.\/)?(index|services|about|contact|privacy|web)\.html"/g, 'href="/$1/"')
      .trim();
  }

  // Заголовок статьи из page-header (без back-link)
  const h1 = extract(/<h1 class="page-title">([^<]+)<\/h1>/, src, 'h1', file);
  const meta = extract(/<p class="blog-meta">([^<]+)<\/p>/, src, 'blog-meta', file);

  // Карточка индекса из blog.html (иконка, тег, текст карточки)
  const idx = read('blog.html');
  const cardRe = new RegExp(
    '<article class="card blog-card reveal">\\s*<span class="blog-card-icon">([^<]*)</span>\\s*<span class="(blog-tag[^"]*)">([^<]*)</span>\\s*<h3 class="blog-card-title"><a href="blog/' +
      slug +
      '.html">([\\s\\S]*?)</a></h3>\\s*<p class="blog-card-text">([\\s\\S]*?)</p>',
    'm'
  );
  const cm = idx.match(cardRe);
  if (!cm) throw new Error('Нет карточки в blog.html для ' + slug);

  manifest.push({
    slug,
    file,
    title,
    desc,
    date,
    h1,
    meta,
    icon: cm[1].trim(),
    tagClass: cm[2],
    tag: cm[3].trim(),
    cardTitle: cm[4].trim(),
    cardText: cm[5].trim(),
    body,
    cta,
    jsonld: ld,
  });
}

// Сортировка по дате desc — как будет на индексе
manifest.sort((a, b) => (a.date < b.date ? 1 : -1));

for (const p of manifest) {
  // 1. Markdown-файл коллекции: тело — сырой HTML (Markdown пропускает HTML)
  const fm = [
    '---',
    'title: ' + JSON.stringify(p.title),
    'date: ' + JSON.stringify(p.date),
    'description: ' + JSON.stringify(p.desc),
    'h1: ' + JSON.stringify(p.h1),
    'meta: ' + JSON.stringify(p.meta),
    'icon: ' + JSON.stringify(p.icon),
    'tagClass: ' + JSON.stringify(p.tagClass),
    'tag: ' + JSON.stringify(p.tag),
    'cardTitle: ' + JSON.stringify(p.cardTitle),
    'cardText: ' + JSON.stringify(p.cardText),
    'cta: ' + JSON.stringify(p.cta),
    '---',
    '',
    p.body.trim(),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(OUT_CONTENT, p.slug + '.md'), fm, 'utf8');

  // 2. Редирект со старого URL /blog/<name>.html
  const redirect = `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="robots" content="noindex">
    <meta http-equiv="refresh" content="0; url=/blog/${p.slug}/">
    <link rel="canonical" href="https://yarkin-tech.github.io/blog/${p.slug}/">
    <title>Перенаправляем…</title>
</head>
<body>
    <p>Статья переехала: <a href="/blog/${p.slug}/">/blog/${p.slug}/</a></p>
</body>
</html>
`;
  fs.writeFileSync(path.join(OUT_REDIRECTS, p.slug + '.html'), redirect, 'utf8');
}

fs.writeFileSync('scripts/blog-manifest.json', JSON.stringify(manifest, null, 2), 'utf8');
console.log('OK: ' + manifest.length + ' статей перенесено');
for (const p of manifest) console.log(p.date + '  ' + p.slug + '  ' + p.title);
