// Проверка meta-информации собранных страниц (шаг 5.1)
const fs = require('fs');
const pages = ['404.html', 'about/index.html', 'contact/index.html', 'privacy/index.html', 'web/index.html'];
for (const p of pages) {
  const h = fs.readFileSync('dist/' + p, 'utf8');
  const t = (h.match(/<title>(.*?)<\/title>/) || [])[1];
  const c = (h.match(/rel="canonical" href="(.*?)"/) || [])[1];
  const r = (h.match(/name="robots" content="(.*?)"/) || [])[1];
  // активный пункт меню
  const am = (h.match(/<a href="(\/[a-z]*\/?)" class="active"/) || [])[1];
  console.log(p, '\n  title:', t, '\n  canonical:', c, '\n  robots:', r || '-', '\n  active-menu:', am || '-');
}
// 404-поведение в dist: Astro кладёт 404.html
console.log('404.html exists:', fs.existsSync('dist/404.html'));
