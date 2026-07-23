/* Adatta il progetto Android generato da `cap add android`:
   inietta il plugin nativo SAF (selettore cartelle di sistema) e lo registra.
   Eseguito in CI dopo `cap add android`, dalla cartella app-mobile/. */
const fs = require('fs');

const PKG_DIR = 'android/app/src/main/java/com/movienaitor/app';

function must(file){ if (!fs.existsSync(file)){ console.error('MANCA', file); process.exit(1); } }

// 1) dipendenza androidx.documentfile (per navigare la cartella SAF)
{
  const g = 'android/app/build.gradle';
  must(g);
  let s = fs.readFileSync(g, 'utf8');
  if (!s.includes('androidx.documentfile')){
    s = s.replace(/dependencies\s*\{/, 'dependencies {\n    implementation "androidx.documentfile:documentfile:1.0.1"');
    fs.writeFileSync(g, s);
    console.log('patched', g);
  }
}

// 2) copia i sorgenti nativi (plugin + MainActivity che lo registra)
{
  fs.mkdirSync(PKG_DIR, { recursive: true });
  for (const f of ['MvnSafPlugin.java', 'MainActivity.java']){
    must('native/' + f);
    fs.copyFileSync('native/' + f, PKG_DIR + '/' + f);
    console.log('copiato', f, '→', PKG_DIR);
  }
}
