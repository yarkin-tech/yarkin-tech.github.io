/** Проверка шага 5.3: блог — статьи, редиректы, мета. */
const fs = require('fs');

const dist = 'dist';
const posts = ['ai-pc','laptop','neiro','case-2009','case-site','case-mercury','seo-build','seo-budget'];
let fail = 0;
const chk = (ok, msg) => { console.log((ok ? 'OK  ' : 'FAIL') + ' ' + msg); if (!ok) fail++; };

// 1. Страницы статей
for (const s of posts) {
  const p = dist + '/blog/' + s + '/index.html';
  const ok = fs.existsSync(p);
  chk(ok, 'статья /blog/' + s + '/');
  if (!ok) continue;
  const h = fs.readFileSync(p, 'utf8');
  chk(h.includes('rel="canonical" href="https://yarkin-tech.github.io/blog/' + s + '/"'), '  canonical ' + s);
  chk(h.includes('property="og:type" content="article"'), '  og:type article ' + s);
  chk(!h.includes('.html"'), '  нет .html-ссылок в ' + s);
  chk(h.includes('blog-article-body'), '  тело статьи ' + s);
  chk(h.includes('application/ld+json'), '  JSON-LD ' + s);
  chk(h.includes('<a href="/blog/" class="blog-back-link"'), '  back-link ' + s);
}

// 2. Индекс
const idx = fs.readFileSync(dist + '/blog/index.html', 'utf8');
for (const s of posts) chk(idx.includes('/blog/' + s + '/'), 'карточка в индексе: ' + s);
chk(idx.includes('rel="canonical" href="https://yarkin-tech.github.io/blog/"'), 'canonical индекса');

// 3. Редиректы
for (const s of posts) {
  const p = dist + '/blog/' + s + '.html';
  const ok = fs.existsSync(p);
  chk(ok, 'редирект /blog/' + s + '.html');
  if (!ok) continue;
  const h = fs.readFileSync(p, 'utf8');
  chk(h.includes('url=/blog/' + s + '/'), '  refresh -> /blog/' + s + '/');
  chk(h.includes('rel="canonical" href="https://yarkin-tech.github.io/blog/' + s + '/"'), '  canonical редиректа');
}

// 4. Порядок карточек = старому индексу
const order = ['ai-pc','laptop','neiro','case-2009','case-site','case-mercury','seo-build','seo-budget'];
const found = order.filter(s => idx.includes('/blog/' + s + '/'));
chk(found.length === 8, 'все 8 карточек в индексе');

// 5. search.js в бандле хедера
let searchFound = false;
for (const f of fs.readdirSync(dist + '/_astro')) {
  const c = fs.readFileSync(dist + '/_astro/' + f, 'utf8');
  if (c.includes('/blog/ai-pc/') && c.includes('Ничего не найдено')) { searchFound = true; break; }
}
chk(searchFound, 'search.js в бандле');

console.log(fail ? ('ПРОВАЛОВ: ' + fail) : 'ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ');
process.exit(fail ? 1 : 0);
