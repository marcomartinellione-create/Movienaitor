/* Adatta il progetto Android generato da `cap add android`:
   - targetSdk 29 + requestLegacyExternalStorage → lettura/scrittura diretta della
     cartella locale sincronizzata (memoria condivisa), senza SAF.
   - permessi di storage nel manifest.
   Eseguito in CI dopo `cap add android`, dalla cartella app-mobile/. */
const fs = require('fs');

function patch(file, fn){
  if (!fs.existsSync(file)){ console.error('MANCA', file); process.exit(1); }
  const before = fs.readFileSync(file, 'utf8');
  const after = fn(before);
  fs.writeFileSync(file, after);
  console.log('patched', file);
}

// 1) variables.gradle → targetSdk 29
patch('android/variables.gradle', s =>
  s.replace(/targetSdkVersion\s*=\s*\d+/, 'targetSdkVersion = 29')
);

// 2) AndroidManifest.xml → permessi + legacy storage
patch('android/app/src/main/AndroidManifest.xml', s => {
  if (!s.includes('READ_EXTERNAL_STORAGE')){
    const perms =
      '    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />\n' +
      '    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />\n';
    s = s.replace('<application', perms + '    <application');
  }
  if (!s.includes('requestLegacyExternalStorage')){
    s = s.replace('<application', '<application android:requestLegacyExternalStorage="true"');
  }
  return s;
});
