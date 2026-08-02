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

// 3) firma di debug STABILE: copia il keystore fisso nel progetto e configura
//    esplicitamente signingConfigs.debug (così non dipende da dove il runner cerca
//    il keystore di default → la firma è identica a ogni build, gli update funzionano).
{
  must('keystore/debug.keystore');
  fs.copyFileSync('keystore/debug.keystore', 'android/app/mvn-debug.keystore');
  const g = 'android/app/build.gradle';
  must(g);
  let s = fs.readFileSync(g, 'utf8');
  if (!s.includes('mvn-debug.keystore')){
    const blocco = `android {
    signingConfigs {
        debug {
            storeFile file('mvn-debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }`;
    s = s.replace(/android\s*\{/, blocco);
    fs.writeFileSync(g, s);
    console.log('signingConfig debug → mvn-debug.keystore');
  }
}

// 3b) aggiornamento in-app: permesso di installare APK + percorsi del FileProvider.
//     L'APK nuovo arriva dalla cartella condivisa, viene copiato nella cache e passato
//     all'installer di sistema tramite il FileProvider di Capacitor.
{
  const man = 'android/app/src/main/AndroidManifest.xml';
  must(man);
  let s = fs.readFileSync(man, 'utf8');
  if (!s.includes('REQUEST_INSTALL_PACKAGES')){
    s = s.replace(/<\/manifest>/,
      '    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />\n</manifest>');
    fs.writeFileSync(man, s);
    console.log('permesso REQUEST_INSTALL_PACKAGES aggiunto');
  }
  if (!s.includes('.fileprovider')){
    console.error('MANCA il FileProvider nel manifest di Capacitor: l\'aggiornamento in-app non funzionerebbe.');
    process.exit(1);
  }
  // il file_paths di Capacitor non espone la cache: lo riscrivo tenendo i suoi percorsi
  const fp = 'android/app/src/main/res/xml/file_paths.xml';
  fs.mkdirSync('android/app/src/main/res/xml', { recursive: true });
  fs.writeFileSync(fp, `<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <external-path name="my_images" path="." />
    <cache-path name="my_cache_images" path="." />
    <files-path name="my_files" path="." />
    <cache-path name="mvn_aggiornamenti" path="aggiornamenti/" />
</paths>
`);
  console.log('file_paths.xml → cache-path per gli aggiornamenti');
}

// 4) versionCode crescente (necessario per aggiornare l'app installata) + versionName
{
  const g = 'android/app/build.gradle';
  must(g);
  let s = fs.readFileSync(g, 'utf8');
  const vc = Math.floor(Date.now() / 60000);           // minuti dall'epoch: sempre crescente
  let vn = '0.2.2';
  try { vn = require('../package.json').version || vn; } catch (e) {}
  s = s.replace(/versionCode\s+\d+/, 'versionCode ' + vc);
  s = s.replace(/versionName\s+"[^"]*"/, 'versionName "' + vn + '"');
  fs.writeFileSync(g, s);
  console.log('versionCode', vc, 'versionName', vn);
}
