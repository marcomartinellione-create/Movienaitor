// Copia Movienaitor.html (fonte unica) in electron/renderer/index.html.
// Così l'app desktop e la versione browser restano lo STESSO file. Eseguito da
// prestart/predist: mai modificare renderer/index.html a mano.
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', 'Movienaitor.html');
const outDir = path.join(__dirname, 'renderer');
const out = path.join(outDir, 'index.html');
fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(src, out);
console.log('renderer/index.html aggiornato da Movienaitor.html (' + fs.statSync(out).size + ' byte)');
