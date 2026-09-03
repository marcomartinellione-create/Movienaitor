/* Aggiorna la copia del manuale dentro docs/, che è quello che GitHub Pages pubblica.

   A differenza delle copie dentro le build (electron/renderer/, app-mobile/www/) questa
   deve stare nel repo, perché Pages serve i file versionati — quindi non è in .gitignore
   e va rigenerata prima di pubblicare, se il manuale è cambiato:

       node strumenti/pagina.js

   La fonte resta una sola: Manuale.html nella radice. docs/manuale.html non si modifica
   a mano, viene sovrascritto. */
const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, '..', 'Manuale.html');
const out = path.resolve(__dirname, '..', 'docs', 'manuale.html');

if (!fs.existsSync(src)) { console.error('MANCA ' + src); process.exit(1); }
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.copyFileSync(src, out);
console.log('docs/manuale.html aggiornato da Manuale.html (' + fs.statSync(out).size + ' byte)');
