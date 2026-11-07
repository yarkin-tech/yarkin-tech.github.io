// Проверка preview-сервера: несуществующий путь должен отдавать страницу 404
const { spawn } = require('child_process');
const http = require('http');

const server = spawn('npx astro preview --port 4399', [], { shell: true, stdio: 'ignore', detached: true });

function probe(tries) {
  http.get('http://localhost:4399/xyz/', (r) => {
    let b = '';
    r.on('data', (d) => (b += d));
    r.on('end', () => {
      console.log('/xyz/ status:', r.statusCode, '| title:', (b.match(/<title>(.*?)<\/title>/) || [])[1]);
      http.get('http://localhost:4399/about/', (r2) => {
        console.log('/about/ status:', r2.statusCode);
        try { process.kill(-server.pid); } catch (e) {}
        process.exit(0);
      });
    });
  }).on('error', () => {
    if (tries > 0) setTimeout(() => probe(tries - 1), 1500);
    else { console.log('server did not start'); process.exit(1); }
  });
}
probe(10);
