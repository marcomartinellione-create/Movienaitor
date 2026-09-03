/* Porta il manuale dentro l'APK: copia Manuale.html (la fonte, nella radice del
   progetto) in app-mobile/www/, da dove il tasto 📖 Guida lo apre in un iframe.

   Si esegue in CI prima di `cap sync`, così l'APK ha SEMPRE il manuale della versione
   che sta compilando: nessuna copia da tenere allineata a mano. La copia in www/ è
   ignorata da git — la fonte è una sola. */
const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..', '..', 'Manuale.html');
const out = path.resolve(__dirname, '..', 'www', 'Manuale.html');

if (!fs.existsSync(src)){
  console.error('MANCA ' + src + ': il tasto 📖 Guida aprirebbe il vuoto.');
  process.exit(1);
}
fs.copyFileSync(src, out);
console.log('www/Manuale.html aggiornato da Manuale.html (' + fs.statSync(out).size + ' byte)');
