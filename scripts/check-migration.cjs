// Фаза 1: сверка полноты миграции (временный скрипт, удаляется после шага 7)
const fs = require('fs');
const path = require('path');
const walk = d => fs.readdirSync(d, { withFileTypes: true })
  .flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name).replace(/\\/g, '/')]);
const has = f => fs.existsSync(f);
const norm = s => s.replace(/\\/g, '/');

// 1. Страницы
const pages = walk('src/pages').sort();
console.log('PAGES:');
pages.forEach(f => console.log('  ', f));

// 2. Контент блога vs старые статьи
const srcBlog = fs.readdirSync('blog').filter(f => f.endsWith('.html')).sort();
const md = fs.readdirSync('src/content/blog').filter(f => f.endsWith('.md')).sort();
const redirects = fs.readdirSync('public/blog').filter(f => f.endsWith('.html')).sort();
const slug = f => f.replace('.html', '').replace('.md', '');
console.log('BLOG: old html:', srcBlog.length, '| md:', md.length, '| redirects:', redirects.length);
const missMd = srcBlog.filter(f => !md.includes(slug(f) + '.md'));
const missRed = srcBlog.filter(f => !redirects.includes(f));
console.log('  md missing:', missMd.length ? missMd.join(', ') : 'none');
console.log('  redirects missing:', missRed.length ? missRed.join(', ') : 'none');

// 3. Изображения
const oldImg = walk('img').filter(f => !f.endsWith('.gitkeep')).map(norm);
const pubImg = walk('public/img');
const missImg = oldImg.filter(f => !pubImg.includes(f));
console.log('IMG: old:', oldImg.length, '| missing in public/img:', missImg.length ? missImg.join(', ') : 'none');

// 4. Ассеты crm/hardware
const oc = has('crm/assets') ? walk('crm/assets').filter(f => !f.endsWith('.gitkeep')) : [];
const hc = has('hardware/assets') ? walk('hardware/assets') : [];
console.log('CRM ASSETS: old:', oc.length ? oc.map(norm).join(', ') : '(пуста)', '| public/crm:', has('public/crm') ? walk('public/crm').join(', ') : 'нет');
console.log('HW ASSETS: old:', hc.map(norm).join(', '), '| public/hardware:', has('public/hardware') ? walk('public/hardware').join(', ') : 'нет');

// 5. hardware-data: количество моделей и побайтовое сравнение данных
const od = fs.readFileSync('hardware/hardware-data.js', 'utf8');
const nd = fs.readFileSync('src/data/hardware-data.js', 'utf8');
const cnt = s => (s.match(/name:\s*['"]/g) || []).length;
console.log('HW DATA: old models:', cnt(od), '| new models:', cnt(nd));
// сравним сами массивы: вырежем от "gpu" до "cpu" и до конца
const arr = s => s.slice(s.indexOf('gpu'));
console.log('HW DATA arrays identical:', arr(od).trim() === arr(nd).trim());

// 6. Скрипты подключены
const layout = fs.readFileSync('src/layouts/BaseLayout.astro', 'utf8');
['main', 'header', 'search'].forEach(s => console.log('LAYOUT has', s + ':', layout.includes(s + '.js')));
const crmPage = fs.readFileSync('src/pages/crm/index.astro', 'utf8');
const hwPage = fs.readFileSync('src/pages/hardware/index.astro', 'utf8');
console.log('crm page has crm.js:', crmPage.includes('crm.js'));
console.log('hardware page has hardware.js:', hwPage.includes('hardware.js'));

// 7. favicon
console.log('favicon public:', has('public/favicon.svg'), '| root:', has('favicon.svg'), '| layout refs /favicon.svg:', layout.includes('/favicon.svg'));
