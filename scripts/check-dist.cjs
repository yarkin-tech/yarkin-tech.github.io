const h = require('fs').readFileSync('dist/index.html', 'utf8');
const pos = s => h.indexOf(s);
console.log('order services<workflow<portfolio<products:',
  pos('services-section') < pos('workflow-section'),
  pos('workflow-section') < pos('portfolio-section'),
  pos('portfolio-section') < pos('products-section'));
console.log('goals:', JSON.stringify((h.match(/data-goal="[^"]+"/g) || []).join(' ')));
console.log('blog hrefs:', (h.match(/\/blog\/[a-z0-9-]+\//g) || []).join(' '));
console.log('crm href:', /href="\/crm\/"/.test(h));
