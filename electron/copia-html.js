// Copia Movienaitor.html (fonte unica) in electron/renderer/index.html, e accanto il
// manuale. Così l'app desktop e la versione browser restano lo STESSO file, e il tasto
// 📖 Guida apre lo STESSO Manuale.html del progetto — ripreso da lì a ogni build, mai
// una copia riscritta. Eseguito da prestart/predist: mai modificare renderer/ a mano.
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', 'Movienaitor.html');
const outDir = path.join(__dirname, 'renderer');
const out = path.join(outDir, 'index.html');
fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(src, out);
console.log('renderer/index.html aggiornato da Movienaitor.html (' + fs.statSync(out).size + ' byte)');

const manuale = path.join(__dirname, '..', 'Manuale.html');
const manualeOut = path.join(outDir, 'Manuale.html');
if (fs.existsSync(manuale)){
  fs.copyFileSync(manuale, manualeOut);
  console.log('renderer/Manuale.html aggiornato (' + fs.statSync(manualeOut).size + ' byte)');
} else {
  console.warn('ATTENZIONE: manca Manuale.html — il tasto 📖 Guida aprirebbe il vuoto.');
}
