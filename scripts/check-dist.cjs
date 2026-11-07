const h = require('fs').readFileSync('dist/index.html', 'utf8');
const ids = ['hero','pc-calculator','works-section','current-work-section','stats-section','why-us','services-section','workflow-section','portfolio-section','products-section','web-teaser-section','cta-section'];
ids.forEach((id, i) => {
  const p = h.indexOf(id);
  console.log(i + 1, id, p > -1 ? 'OK' : 'MISSING');
});
console.log('calc js:', h.includes('calc-btn') ? 'OK' : 'NO');
console.log('current-work-list:', h.includes('current-work-list') ? 'OK' : 'NO');
const m = h.match(/\/contact\//g);
console.log('/contact/ hrefs:', m ? m.length : 0);
const old = h.match(/href="[a-z-]+\.html/g);
console.log('old-style .html refs:', old ? old.length : 0);
