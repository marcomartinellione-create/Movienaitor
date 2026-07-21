// Mini server statico per sviluppo (solo anteprima locale).
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const mime = {'.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.dxf':'text/plain'};
http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  let p = path.join(root, url === '/' ? 'Movienaitor.html' : url);
  if (!p.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(p, (err, dati) => {
    if (err) { res.writeHead(404); return res.end('non trovato'); }
    res.writeHead(200, {'Content-Type': mime[path.extname(p).toLowerCase()] || 'application/octet-stream'});
    res.end(dati);
  });
}).listen(8137, () => console.log('Movienaitor su http://localhost:8137'));
