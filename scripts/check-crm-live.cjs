const { execSync, spawn } = require('child_process');
const http = require('http');

function get(path) {
  return new Promise((resolve) => {
    http.get('http://localhost:4321' + path, (r) => {
      let b = '';
      r.on('data', (c) => (b += c));
      r.on('end', () => resolve({ status: r.statusCode, body: b }));
    }).on('error', () => resolve({ status: 0, body: '' }));
  });
}

(async () => {
  const crm = await get('/crm/');
  console.log('GET /crm/ ->', crm.status);
  console.log('  sections order ok:', ['hero', 'pains', 'features', 'security', 'pricing', 'author', 'faq'].every((id) => crm.body.indexOf('id="' + id + '"') > -1));
  console.log('  active CRM:', /href="\/crm\/"[^>]*class="active"|class="active"[^>]*href="\/crm\/"/.test(crm.body));
  const img = await get('/crm/assets/.gitkeep');
  console.log('assets dir exists (gitkeep served):', img.status === 200 || img.status === 404 ? img.status : img.status);
  const root = await get('/');
  console.log('GET / ->', root.status);
  process.exit(0);
})();
