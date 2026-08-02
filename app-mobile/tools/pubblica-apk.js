/* ═══════════════════════════════════════════════════════════════════════════
   pubblica-apk.js — costruisce l'APK di Movienaitor e lo pubblica nella
   cartella condivisa, così i telefoni del gruppo si aggiornano da soli.

   Uso (dal file "Pubblica APK.bat", oppure):
     node tools/pubblica-apk.js            → ricompila la versione attuale
     node tools/pubblica-apk.js 1.3.0      → imposta la versione e compila
     node tools/pubblica-apk.js +          → alza di uno l'ultimo numero
     ... --locale                          → compila sul PC (serve setup-android.ps1)
     ... --note "cosa cambia"              → nota mostrata sul telefono
     ... --prova                           → controlla tutto senza toccare niente

   Dove pubblica: il percorso scritto in  app-mobile/pubblica.txt
   (la sottocartella "Latest APK" della cartella condivisa del gruppo).
   Nella cartella finiscono l'APK e un versione.json che l'app legge per
   accorgersi dell'aggiornamento.

   Come compila, di default: manda i sorgenti su GitHub e usa il workflow
   "Build APK" (niente toolchain Android da installare sul PC). Serve `gh`
   autenticato. Con --locale usa invece build-apk.ps1.
═══════════════════════════════════════════════════════════════════════════ */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');          // app-mobile/
const REPO = path.resolve(ROOT, '..');               // radice del progetto
const PKG = path.join(ROOT, 'package.json');
const WWW = path.join(ROOT, 'www', 'index.html');
const PUBFILE = path.join(ROOT, 'pubblica.txt');
const WORKFLOW = 'build-apk.yml';
const ARTIFACT = 'movienaitor-apk';

const c = { ok:'\x1b[32m', warn:'\x1b[33m', err:'\x1b[31m', dim:'\x1b[90m', b:'\x1b[1m', x:'\x1b[0m' };
const say = m => console.log(m);
const step = m => say('\n' + c.b + '▸ ' + m + c.x);
const muori = m => { say('\n' + c.err + '✕ ' + m + c.x); process.exit(1); };

function esegui(cmd, opts = {}){
  const r = spawnSync(cmd, { cwd:opts.cwd || REPO, stdio:opts.zitto ? 'pipe' : 'inherit', shell:true, encoding:'utf8' });
  if (opts.zitto) return { code:r.status, out:(r.stdout || '').trim(), err:(r.stderr || '').trim() };
  return { code:r.status };
}

/* ── argomenti ─────────────────────────────────────────────────────────── */
const argv = process.argv.slice(2);
const LOCALE = argv.includes('--locale');
const PROVA = argv.includes('--prova');   // giro a vuoto: nessuna scrittura, nessun push
const iNote = argv.indexOf('--note');
const NOTE = iNote >= 0 ? (argv[iNote + 1] || '').trim() : '';
const arg = (argv.find(a => !a.startsWith('--') && a !== NOTE) || '').trim();

/* ── 1. versione ───────────────────────────────────────────────────────── */
const pkg = JSON.parse(fs.readFileSync(PKG, 'utf8'));
if (arg === '+'){
  const p = String(pkg.version).split('.').map(Number);
  p[2] = (p[2] || 0) + 1;
  pkg.version = p.join('.');
} else if (arg){
  if (!/^\d+\.\d+\.\d+$/.test(arg)) muori('Versione non valida: "' + arg + '". Usa il formato 1.2.3 oppure + per alzarla di uno.');
  pkg.version = arg;
}
const version = pkg.version;

// la versione va in due posti: package.json (→ versionName dell'APK) e APP_VERSION
// nel web (quella che l'app mostra e scrive nelle segnalazioni). Devono coincidere.
{
  let s = fs.readFileSync(WWW, 'utf8');
  const nuovo = s.replace(/const APP_VERSION = '[^']*';/, "const APP_VERSION = '" + version + "';");
  if (nuovo === s && !s.includes("const APP_VERSION = '" + version + "'"))
    muori('Non trovo APP_VERSION in www/index.html: controlla il file.');
  if (!PROVA){
    fs.writeFileSync(PKG, JSON.stringify(pkg, null, 2) + '\n');
    fs.writeFileSync(WWW, nuovo);
  }
}

say('\n' + c.b + 'Movienaitor mobile ' + version + c.x);
say(c.dim + 'Finirà in: package.json, APP_VERSION del web, versionName dell\'APK e versione.json.' + c.x);

/* ── 2. dove pubblicare (lo controllo SUBITO: inutile compilare per niente) ── */
if (!fs.existsSync(PUBFILE)) muori('Manca ' + PUBFILE + '\n  Scrivici dentro il percorso della cartella "Latest APK".');
const DEST = fs.readFileSync(PUBFILE, 'utf8').split('\n')[0].trim().replace(/^"|"$/g, '');
if (!DEST) muori('pubblica.txt è vuoto: scrivici il percorso della cartella "Latest APK".');
try { fs.mkdirSync(DEST, { recursive:true }); }
catch(e){ muori('Cartella di pubblicazione non raggiungibile:\n  ' + DEST + '\n  ' + e.message); }
say(c.dim + 'Pubblicherò in: ' + DEST + c.x);

/* ── 3. compilazione ───────────────────────────────────────────────────── */
let apkSorgente;

if (PROVA){
  step('Giro di prova: controllo gli strumenti e mi fermo qui.');
  const gh = esegui('gh --version', { zitto:true });
  say('  gh (GitHub CLI): ' + (gh.code === 0 ? c.ok + 'ok — ' + gh.out.split('\n')[0] + c.x : c.warn + 'assente (serve per la build in cloud)' + c.x));
  const auth = esegui('gh auth status', { zitto:true });
  say('  autenticazione : ' + (auth.code === 0 ? c.ok + 'ok' + c.x : c.warn + 'da fare: gh auth login' + c.x));
  const wf = esegui('gh workflow list --json name,state', { zitto:true });
  say('  workflow       : ' + (wf.code === 0 && wf.out.includes('APK') ? c.ok + 'trovato' + c.x : c.warn + 'controlla Actions su GitHub' + c.x));
  say('  cartella       : ' + c.ok + DEST + c.x);
  say('  pubblicherei   : Movienaitor-' + version + '.apk + versione.json' + (NOTE ? ' (nota: "' + NOTE + '")' : ''));
  say('\n' + c.dim + 'Nessun file toccato. Togli --prova per pubblicare davvero.' + c.x);
  process.exit(0);
}

if (LOCALE){
  step('Compilo sul PC (build-apk.ps1)…');
  const r = esegui('powershell -ExecutionPolicy Bypass -File "' + path.join(ROOT, 'build-apk.ps1') + '"', { cwd:ROOT });
  if (r.code !== 0) muori('Compilazione locale fallita (serve la toolchain: .\\setup-android.ps1).');
  apkSorgente = path.join(ROOT, 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
  if (!fs.existsSync(apkSorgente)) muori('APK non trovato in ' + apkSorgente);
} else {
  step('Mando i sorgenti su GitHub (la build gira in cloud)…');
  if (esegui('gh --version', { zitto:true }).code !== 0)
    muori('Manca il comando `gh` (GitHub CLI), che serve per la build in cloud.\n  In alternativa compila sul PC:  node tools/pubblica-apk.js ' + version + ' --locale');

  // commit + push di app-mobile: la CI compila quello che c'è nel repo
  const sporco = esegui('git status --porcelain app-mobile', { zitto:true }).out;
  if (sporco){
    esegui('git add app-mobile');
    const r = esegui('git commit -m "APK mobile v' + version + '"');
    if (r.code !== 0) muori('Commit non riuscito.');
    say(c.ok + '  commit fatto' + c.x);
  } else {
    say(c.dim + '  niente da committare in app-mobile' + c.x);
  }
  const altro = esegui('git status --porcelain', { zitto:true }).out;
  if (altro) say(c.warn + '  ⚠ restano modifiche fuori da app-mobile, NON pubblicate:\n' + altro.split('\n').map(l => '     ' + l).join('\n') + c.x);
  if (esegui('git push').code !== 0) muori('Push non riuscito.');

  step('Build in cloud…');
  // il push su app-mobile/ fa già partire il workflow: aspetto QUEL run (stesso commit)
  // invece di lanciarne un secondo identico. Se non parte, lo avvio a mano.
  const sha = esegui('git rev-parse HEAD', { zitto:true }).out;
  let runId = null;
  for (let i = 0; i < 8 && !runId; i++){ attendi(4000); runId = runDelCommit(sha); }
  if (!runId){
    say(c.dim + '  non è partito da solo: lo avvio io' + c.x);
    const prima = ultimoRunId();
    if (esegui('gh workflow run ' + WORKFLOW).code !== 0) muori('Non sono riuscito ad avviare il workflow.');
    for (let i = 0; i < 20 && !runId; i++){
      attendi(3000);
      const id = ultimoRunId();
      if (id && id !== prima) runId = id;
    }
  }
  if (!runId) muori('Il workflow non è partito. Guarda su GitHub → Actions.');
  say(c.dim + '  run ' + runId + ' — aspetto (di solito 4-6 minuti)…' + c.x);

  const inizio = Date.now();
  for (;;){
    const r = esegui('gh run view ' + runId + ' --json status,conclusion', { zitto:true });
    let j = {}; try { j = JSON.parse(r.out || '{}'); } catch(e){}
    if (j.status === 'completed'){
      if (j.conclusion !== 'success') muori('Build fallita su GitHub (conclusione: ' + j.conclusion + ').\n  Dettagli: gh run view ' + runId + ' --log-failed');
      break;
    }
    if (Date.now() - inizio > 25 * 60000) muori('Build troppo lunga (25 minuti): controlla su GitHub → Actions.');
    process.stdout.write(c.dim + '.' + c.x);
    attendi(15000);
  }
  say('');

  step('Scarico l\'APK…');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mvn-apk-'));
  if (esegui('gh run download ' + runId + ' -n ' + ARTIFACT + ' -D "' + tmp + '"').code !== 0)
    muori('Download dell\'artifact non riuscito.');
  apkSorgente = path.join(tmp, 'app-debug.apk');
  if (!fs.existsSync(apkSorgente)) muori('Nell\'artifact non c\'è app-debug.apk.');
}

const mb = (fs.statSync(apkSorgente).size / 1048576).toFixed(1);
say(c.ok + '✓ APK pronto (' + mb + ' MB)' + c.x);

/* ── 4. pubblicazione ──────────────────────────────────────────────────── */
step('Pubblico in: ' + DEST);
const nomeApk = 'Movienaitor-' + version + '.apk';
try {
  // prima l'APK, poi versione.json: se il Drive sincronizza a metà, i telefoni non
  // vedono mai un versione.json che punta a un file non ancora arrivato.
  fs.copyFileSync(apkSorgente, path.join(DEST, nomeApk));
  fs.writeFileSync(path.join(DEST, 'versione.json'), JSON.stringify({
    versione: version,
    file: nomeApk,
    note: NOTE || undefined,
    pubblicato: new Date().toISOString()
  }, null, 2) + '\n', 'utf8');

  // tiene solo gli ultimi 3 APK
  const vecchi = fs.readdirSync(DEST)
    .filter(f => /^Movienaitor-.*\.apk$/i.test(f) && f !== nomeApk)
    .map(f => ({ f, t:fs.statSync(path.join(DEST, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t)
    .slice(2);
  vecchi.forEach(v => { try { fs.unlinkSync(path.join(DEST, v.f)); } catch(e){} });

  say(c.ok + '\n✓ Pubblicato ' + nomeApk + c.x);
  say(c.dim + '  I telefoni lo vedono appena la cartella si sincronizza:' + c.x);
  say(c.dim + '  l\'app mostra «Aggiornamento disponibile» e con un tocco lo installa.' + c.x);
  if (vecchi.length) say(c.dim + '  (rimossi ' + vecchi.length + ' APK vecchi)' + c.x);
} catch(e){
  muori('Pubblicazione fallita: ' + e.message + '\n  L\'APK compilato è in: ' + apkSorgente);
}

/* ── utilità ───────────────────────────────────────────────────────────── */
function ultimoRunId(){
  const r = esegui('gh run list --workflow ' + WORKFLOW + ' --limit 1 --json databaseId', { zitto:true });
  try { return (JSON.parse(r.out || '[]')[0] || {}).databaseId || null; } catch(e){ return null; }
}
function runDelCommit(sha){
  if (!sha) return null;
  const r = esegui('gh run list --workflow ' + WORKFLOW + ' --limit 10 --json databaseId,headSha', { zitto:true });
  try {
    const run = JSON.parse(r.out || '[]').find(x => x.headSha === sha);
    return run ? run.databaseId : null;
  } catch(e){ return null; }
}
function attendi(ms){ Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); }
