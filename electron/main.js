// Movienaitor — wrapper Electron.
// Diversamente dalla TMS, i dati NON stanno in userData ma in una cartella condivisa
// (Google Drive) scelta dall'utente col picker nativo: è il "server" del gruppo.
// Il renderer (lo stesso Movienaitor.html del browser) parla con questo main via il
// ponte window.mvnFS (preload.js). Serviamo il renderer da app://mvn così che
// localStorage abbia un'origine stabile (ricordare "chi sei" tra i riavvii).
const { app, BrowserWindow, protocol, net, dialog, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const fss = require('node:fs');
const https = require('node:https');
const { pathToFileURL } = require('node:url');
let autoUpdater = null;
try { autoUpdater = require('electron-updater').autoUpdater; } catch (e) { /* dipendenza assente in dev */ }

const REPO_OWNER = 'marcomartinellione-create';
const REPO_NAME = 'Movienaitor';
const REPO_RELEASES = `https://github.com/${REPO_OWNER}/${REPO_NAME}/releases`;

// ── cartella condivisa (persistita in userData/mvn-config.json) ──────────────
const CFG = () => path.join(app.getPath('userData'), 'mvn-config.json');
let cartella = null;
// Config persistente in userData: cartella collegata + ultimo profilo scelto ("chi sei").
// Sta qui, non in localStorage, perché su app://mvn il localStorage non sopravvive ai riavvii.
async function leggiCfg(){ try { return JSON.parse(await fs.readFile(CFG(), 'utf8')) || {}; } catch (e) { return {}; } }
async function scriviCfg(patch){ const c = await leggiCfg(); Object.assign(c, patch); try { await fs.writeFile(CFG(), JSON.stringify(c)); } catch (e) {} }
async function caricaCartella(){
  const j = await leggiCfg();
  if (j.cartella) cartella = j.cartella;
  if (cartella && !fss.existsSync(cartella)) cartella = null; // sync spostata/rimossa
}
async function salvaCartella(){ await scriviCfg({ cartella }); }

// ogni percorso relativo deve restare DENTRO la cartella condivisa
function risolvi(rel){
  if (!cartella) throw new Error('nessuna cartella collegata');
  const p = path.normalize(path.join(cartella, String(rel || '')));
  const fuori = path.relative(cartella, p);
  if (fuori.startsWith('..') || path.isAbsolute(fuori)) throw new Error('percorso non consentito: ' + rel);
  return p;
}
const MIME = { '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.png':'image/png', '.webp':'image/webp' };

protocol.registerSchemesAsPrivileged([{
  scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true }
}]);

function registraIPC(){
  ipcMain.handle('mvn:scegli', async () => {
    const r = await dialog.showOpenDialog({
      title: 'Scegli la cartella condivisa di Movienaitor',
      properties: ['openDirectory', 'createDirectory']
    });
    if (r.canceled || !r.filePaths[0]) return null;
    cartella = r.filePaths[0]; await salvaCartella();
    return { path: cartella, name: path.basename(cartella) };
  });
  ipcMain.handle('mvn:corrente', () => cartella ? { path: cartella, name: path.basename(cartella) } : null);

  // "chi sei": ultimo profilo scelto, ricordato tra i riavvii
  ipcMain.handle('mvn:getMe', async () => (await leggiCfg()).lastProfile || null);
  ipcMain.handle('mvn:setMe', async (e, slug) => { await scriviCfg({ lastProfile: slug || null }); return true; });

  ipcMain.handle('mvn:readJSON', async (e, rel) => {
    try { return JSON.parse(await fs.readFile(risolvi(rel), 'utf8')); } catch (err) { return null; }
  });
  ipcMain.handle('mvn:writeJSON', async (e, rel, obj) => {
    const p = risolvi(rel);
    await fs.mkdir(path.dirname(p), { recursive: true });
    const txt = JSON.stringify(obj, null, 2);
    // scrittura atomica: un crash a metà non corrompe il file esistente (storici insostituibili)
    const tmp = p + '.tmp-' + process.pid + '-' + Date.now();
    try { await fs.writeFile(tmp, txt, 'utf8'); await fs.rename(tmp, p); }
    catch (err) { try { await fs.rm(tmp, { force: true }); } catch (e2) {} await fs.writeFile(p, txt, 'utf8'); }
    return true;
  });
  ipcMain.handle('mvn:writeBlob', async (e, rel, buf) => {
    const p = risolvi(rel);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, Buffer.from(buf));
    return true;
  });
  ipcMain.handle('mvn:list', async (e, rel) => {
    try {
      const items = await fs.readdir(risolvi(rel), { withFileTypes: true });
      return items.filter(d => d.isFile()).map(d => d.name);
    } catch (err) { return []; }
  });
  ipcMain.handle('mvn:fileURL', async (e, rel) => {
    try {
      const p = risolvi(rel);
      const b = await fs.readFile(p);
      const mime = MIME[path.extname(p).toLowerCase()] || 'application/octet-stream';
      return `data:${mime};base64,${b.toString('base64')}`;
    } catch (err) { return null; }
  });
  ipcMain.handle('mvn:scarica', (e, url, rel) => new Promise((resolve) => {
    try {
      const p = risolvi(rel);
      https.get(url, (res) => {
        if (res.statusCode !== 200) { res.resume(); return resolve(false); }
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', async () => {
          try { await fs.mkdir(path.dirname(p), { recursive: true }); await fs.writeFile(p, Buffer.concat(chunks)); resolve(true); }
          catch (err) { resolve(false); }
        });
      }).on('error', () => resolve(false));
    } catch (err) { resolve(false); }
  }));
  ipcMain.handle('mvn:releases', () => shell.openExternal(REPO_RELEASES));
  ipcMain.handle('mvn:versione', () => app.getVersion());
}

function createWindow(){
  const win = new BrowserWindow({
    width: 1280, height: 840, minWidth: 940, minHeight: 620,
    backgroundColor: '#191014', title: 'Movienaitor',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  win.removeMenu();
  win.loadURL('app://mvn/index.html');
  if (process.env.MVN_DIAG) diagnostica(win);
  return win;
}

// Hook di verifica automatica (attivo solo con MVN_DIAG): controlla che il renderer
// carichi da app://mvn e che il ponte window.mvnFS funzioni davvero contro una cartella
// (MVN_DIAG_DIR). Non incide sull'uso normale. Chiude l'app a controllo finito.
function diagnostica(win){
  const wc = win.webContents;
  setTimeout(() => { console.log('DIAG timeout'); app.quit(); }, 15000); // rete di sicurezza
  wc.on('did-fail-load', (e, code, desc, url) => console.log('DIAG did-fail-load', code, desc, url));
  wc.on('preload-error', (e, p, err) => console.log('DIAG preload-error', err && err.message));
  wc.on('render-process-gone', (e, d) => console.log('DIAG render-gone', JSON.stringify(d)));
  wc.on('did-finish-load', async () => {
    try {
      const base = await wc.executeJavaScript(
        `JSON.stringify({mvnFS: typeof window.mvnFS, mvnUpdate: typeof window.mvnUpdate, ` +
        `url: location.href, gate: (document.querySelector('#gate-card')||{}).textContent && document.querySelector('#gate-card').textContent.replace(/\\s+/g,' ').trim().slice(0,70), ` +
        `btnCollega: !!document.querySelector('#btn-collega')})`);
      console.log('DIAG base', base);
      if (process.env.MVN_DIAG_SETME){ await wc.executeJavaScript(`window.mvnFS.ricordaProfilo(${JSON.stringify(process.env.MVN_DIAG_SETME)})`); console.log('DIAG setme', process.env.MVN_DIAG_SETME); }
      console.log('DIAG getme', JSON.stringify(await wc.executeJavaScript('window.mvnFS.profiloRicordato()')));
      if (process.env.MVN_DIAG_DIR){
        const rt = await wc.executeJavaScript(`(async()=>{
          await window.mvnFS.writeJSON('profili/_diag.json', {nome:'Diag', slug:'_diag', lista:[1,2,3]});
          const back = await window.mvnFS.readJSON('profili/_diag.json');
          const list = await window.mvnFS.list('profili');
          await window.mvnFS.writeJSON('storico.json', {visioni:[]});
          return JSON.stringify({scritto:!!back, voci:back&&back.lista.length, list, url:await window.mvnFS.fileURL('mancante.jpg')});
        })()`);
        console.log('DIAG roundtrip', rt);
      }
    } catch (err) { console.log('DIAG exec-err', err.message); }
    console.log('DIAG done');
    setTimeout(() => app.quit(), 300);
  });
}

// Auto-update via GitHub Releases (solo app installata). Repo PUBBLICO: nessun token,
// electron-updater legge da sé le release. In caso di errore (es. offline) resta il
// bottone "Pagina rilasci" nell'app come via manuale.
function avviaUpdater(){
  if (!app.isPackaged || !autoUpdater) return;
  autoUpdater.autoDownload = false;
  const manda = (d) => { const w = BrowserWindow.getAllWindows()[0]; if (w) try { w.webContents.send('mvn-update', d); } catch (e) {} };
  autoUpdater.on('update-available', (info) => manda({ tipo: 'disponibile', versione: info.version }));
  autoUpdater.on('update-downloaded', (info) => manda({ tipo: 'pronto', versione: info.version }));
  autoUpdater.on('error', () => { /* offline o repo privato senza token: silenzio */ });
  ipcMain.on('mvn-update-azione', (e, azione) => {
    if (azione === 'scarica') autoUpdater.downloadUpdate().catch(() => {});
    else if (azione === 'riavvia') autoUpdater.quitAndInstall();
  });
  autoUpdater.checkForUpdates().catch(() => {});
}

if (!app.requestSingleInstanceLock()){
  app.quit();
} else {
  app.on('second-instance', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w){ if (w.isMinimized()) w.restore(); w.focus(); }
  });
  app.whenReady().then(async () => {
    await caricaCartella();
    if (process.env.MVN_DIAG_DIR) cartella = process.env.MVN_DIAG_DIR; // solo per la verifica automatica
    registraIPC();
    // serve renderer/ sotto app://mvn/… con protezione path traversal
    protocol.handle('app', (request) => {
      const url = new URL(request.url);
      const rel = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html';
      const dir = path.join(__dirname, 'renderer');
      const file = path.join(dir, path.normalize(rel));
      const fuori = path.relative(dir, file);
      if (fuori.startsWith('..') || path.isAbsolute(fuori)) return new Response('Forbidden', { status: 403 });
      return net.fetch(pathToFileURL(file).toString());
    });
    createWindow();
    avviaUpdater();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
