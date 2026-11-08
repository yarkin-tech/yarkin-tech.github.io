// Проверка собранной страницы /hardware/ (шаг 6.2)
const fs = require('fs');

const h = fs.readFileSync('dist/hardware/index.html', 'utf8');
console.log('counter shows 50:', (h.match(/id="hw-total"[^>]*>50</g) || []).length === 1);
console.log('found shows 50:', (h.match(/id="hw-found"[^>]*>50</g) || []).length === 1);
console.log('svg asset refs:', (h.match(/\/hardware\/assets\/\w+\.svg/g) || []).length);
console.log('old header copied:', h.includes('../index.html'));
console.log('modal present:', h.includes('id="hw-modal"'));
console.log('compare tray present:', h.includes('id="hw-compare"'));

// JS-бандл: данные и цели Метрики
let bundle = '';
for (const f of fs.readdirSync('dist/_astro')) {
  if (f.endsWith('.js')) bundle += fs.readFileSync('dist/_astro/' + f, 'utf8') + '\n';
}
console.log('RTX 5090 in bundle:', bundle.includes('RTX 5090'));
console.log('i3-12100F in bundle:', bundle.includes('i3-12100F'));
console.log('goals hw_search/hw_filter/hw_sort:', ['hw_search', 'hw_filter', 'hw_sort'].every(g => bundle.includes(g)));
console.log('goal hw_card_open:', bundle.includes('hw_card_open'));
console.log('goal hw_compare_full:', bundle.includes('hw_compare_full'));
console.log('ym guard:', bundle.includes('typeof ym'));

// Бренд-логотипы физически на месте
for (const f of ['amd.svg', 'intel.svg', 'nvidia.svg']) {
  console.log('public ' + f + ':', fs.existsSync('public/hardware/assets/' + f));
}
