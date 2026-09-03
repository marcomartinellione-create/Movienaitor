/* Genera app-mobile/www/prova.html: l'app del telefono con una cartella finta dentro,
   per poterla navigare dal browser senza APK, senza SAF e senza toccare dati veri.

       node app-mobile/scripts/crea-prova.js
       poi apri  http://localhost:8137/app-mobile/www/prova.html

   È l'app vera, non una copia ridotta: viene solo iniettato uno stub del plugin nativo
   prima dello script, con qualche profilo e qualche titolo in memoria. Lo stub sopravvive
   ai ricaricamenti (sta nel file) e le scritture restano nel localStorage del browser,
   così si può provare anche a salvare. Il file è ignorato da git. */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', 'www', 'index.html');
const OUT = path.resolve(__dirname, '..', 'www', 'prova.html');

const app = fs.readFileSync(SRC, 'utf8');

const oggi = new Date().toISOString().slice(0, 10);
const g = (n) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);

const profili = {
  marco:  { nome:'Marco',  slug:'marco',  colore:'#c9a45c', creato:'2026-01-05', password:'',
            serviziStreaming:['Netflix','Prime Video'], generiPositivi:['Fantascienza'], generiNegativi:['Horror'] },
  elena:  { nome:'Elena',  slug:'elena',  colore:'#a85454', creato:'2026-01-06', password:'',
            serviziStreaming:['Netflix','Disney+'], modi:['film','serie','libri'] },
  simone: { nome:'Simone', slug:'simone', colore:'#7d9b76', creato:'2026-02-11', password:'',
            serviziStreaming:['Prime Video'] },
};

// Qualche titolo per categoria: bastano a far vedere Sala, classifica e liste.
const film = [
  {tmdbId:438631, titolo:'Dune', anno:'2021', durata:155, regista:'Denis Villeneuve', generi:['Fantascienza','Avventura'], voto:8.0, votoFonte:'imdb', collezione:726871, collezioneNome:'Dune - Collezione', trama:'Paul Atreides guida la sua casata verso il pianeta più pericoloso dell\'universo.'},
  {tmdbId:693134, titolo:'Dune - Parte Due', anno:'2024', durata:166, regista:'Denis Villeneuve', generi:['Fantascienza','Avventura'], voto:8.5, votoFonte:'imdb', collezione:726871, collezioneNome:'Dune - Collezione', trama:'Paul si unisce ai Fremen e intraprende un cammino di vendetta.'},
  {tmdbId:335984, titolo:'Blade Runner 2049', anno:'2017', durata:164, regista:'Denis Villeneuve', generi:['Fantascienza','Dramma'], voto:8.0, votoFonte:'imdb', trama:'L\'agente K scopre un segreto sepolto.'},
  {tmdbId:27205,  titolo:'Inception', anno:'2010', durata:148, regista:'Christopher Nolan', generi:['Fantascienza','Azione'], voto:8.8, votoFonte:'imdb', trama:'Un ladro che ruba segreti dai sogni.'},
  {tmdbId:274,    titolo:'Il silenzio degli innocenti', anno:'1991', durata:118, regista:'Jonathan Demme', generi:['Thriller','Crime'], voto:8.6, votoFonte:'imdb', trama:'Una giovane agente dell\'FBI e un cannibale geniale.'},
  {tmdbId:11216,  titolo:'Nuovo Cinema Paradiso', anno:'1988', durata:155, regista:'Giuseppe Tornatore', generi:['Dramma'], voto:8.5, votoFonte:'imdb', trama:'Un regista ricorda l\'amicizia col proiezionista del paese.'},
];
const serie = [
  {tmdbId:1396, titolo:'Breaking Bad', anno:'2008', durata:47, regista:'Vince Gilligan', generi:['Dramma','Crime'], voto:9.5, votoFonte:'imdb', trama:'Un professore di chimica malato entra nel giro della metanfetamina.'},
  {tmdbId:1399, titolo:'Il Trono di Spade', anno:'2011', durata:57, regista:'David Benioff', generi:['Fantasy','Dramma'], voto:9.2, votoFonte:'imdb', trama:'Nobili casate si contendono il Trono di Spade.'},
];
const giochi = [
  {tmdbId:3498,  titolo:'Grand Theft Auto V', anno:'2013', durata:31, generi:['Azione','Avventura'], voto:92, votoFonte:'metacritic', trama:'Tre criminali a Los Santos.'},
  {tmdbId:28,    titolo:'Red Dead Redemption 2', anno:'2018', durata:49, generi:['Azione','Avventura'], voto:96, votoFonte:'metacritic', trama:'Arthur Morgan e la banda di Van der Linde.'},
];
const libri = [
  {tmdbId:'OL27448W', titolo:'Il nome della rosa', anno:'1980', durata:512, pagine:512, regista:'Umberto Eco', generi:['Giallo storico'], voto:8.1, votoFonte:'openlibrary', trama:'Un frate indaga su morti misteriose in un\'abbazia.'},
  {tmdbId:'OL45804W', titolo:'Le città invisibili', anno:'1972', durata:164, pagine:164, regista:'Italo Calvino', generi:['Narrativa'], voto:8.3, votoFonte:'openlibrary', trama:'Marco Polo racconta al Kublai Khan città impossibili.'},
];

const voce = (t, desiderio, extra = {}) => ({
  ...t, desiderio, conChi:[], nonCon:[], aggiunto:g(30), uscita:(t.anno||'2020')+'-01-01',
  posterUrl:null, locandina:null, ...extra
});

profili.marco.lista  = [voce(film[0],5), voce(film[2],4), voce(film[3],5), voce(film[5],3)];
profili.elena.lista  = [voce(film[0],4), voce(film[4],5), voce(film[5],4)];
profili.simone.lista = [voce(film[2],3), voce(film[3],4)];

// le altre categorie stanno nello stesso profilo, in liste separate
profili.marco.listaSerie  = [voce(serie[0],5), voce(serie[1],3)];
profili.elena.listaSerie  = [voce(serie[0],4)];
profili.marco.listaGiochi = [voce(giochi[0],4), voce(giochi[1],5)];
profili.marco.listaLibri  = [voce(libri[0],5), voce(libri[1],4)];
profili.elena.listaLibri  = [voce(libri[1],5)];

const disco = {
  'config.json': JSON.stringify({ tmdbKey:'', rawgKey:'',
    bonusCoralita:0.10, capCoralita:0.30, passoSoddisfazione:0.15, bonusCoppia:1.15 }, null, 2),
  'storico.json': JSON.stringify({ visioni:[
    { id:'s1', tmdbId:11216, titolo:'Nuovo Cinema Paradiso', data:g(21), presenti:['marco','elena'], proponenti:['elena'] },
    { id:'s2', tmdbId:27205, titolo:'Inception', data:g(9), presenti:['marco','elena','simone'], proponenti:['marco'] },
  ]}, null, 2),
  'segnalazioni/elena.json': JSON.stringify({ segnalazioni:[
    { id:'e1', tipo:'suggerimento', titolo:'Un tasto «a caso» in Sala',
      descrizione:'Quando non ci mettiamo d\'accordo, decida lui fra i primi tre.',
      contesto:'sala', versione:'1.7.20-mobile', creato:g(4)+'T20:10:00.000Z', autore:'elena' },
  ]}, null, 2),
  'segnalazioni/simone.json': JSON.stringify({ segnalazioni:[
    { id:'s9', tipo:'bug', gravita:'rallenta', titolo:'La locandina resta grigia',
      descrizione:'Con la rete lenta la prima riga non carica.',
      contesto:'lista', versione:'1.7.20-mobile', creato:g(2)+'T21:40:00.000Z', autore:'simone' },
  ]}, null, 2),
};

const stub = `
<script>
/* ── CARTELLA FINTA (solo per prova.html) ─────────────────────────────────
   Sostituisce il plugin nativo con uno che tiene i file in localStorage: si
   naviga tutta l'app dal browser, e quello che salvi resta fra un giro e
   l'altro. Per ricominciare da capo: svuota i dati del sito, oppure
   localStorage.clear() dalla console. */
(() => {
  const CHIAVE = 'mvn_prova_disco';
  const INIZIALE = ${JSON.stringify(disco)};
  const PROFILI = ${JSON.stringify(profili)};
  let disco;
  try { disco = JSON.parse(localStorage.getItem(CHIAVE)) || null; } catch(e){ disco = null; }
  if (!disco){
    disco = {...INIZIALE};
    for (const [slug, p] of Object.entries(PROFILI)) disco['profili/'+slug+'.json'] = JSON.stringify(p, null, 2);
    salva();
  }
  function salva(){ try { localStorage.setItem(CHIAVE, JSON.stringify(disco)); } catch(e){} }
  const uriDi = percorso => 'prova://' + percorso;
  const percorsoDi = uri => String(uri).replace('prova://', '');

  window.Capacitor = { Plugins: { MvnSaf: {
    pickFolder: async () => ({ uri:'prova://cartella' }),
    loadFolder: async () => ({
      config: disco['config.json'] || null,
      storico: disco['storico.json'] || null,
      profili: Object.keys(disco).filter(k => k.startsWith('profili/')).map(k => ({
        name: k.slice('profili/'.length), uri: uriDi(k), data: disco[k]
      })),
    }),
    read:  async ({uri}) => ({ data: disco[percorsoDi(uri)] ?? null }),
    write: async ({uri, data}) => { disco[percorsoDi(uri)] = data; salva(); return {}; },
    leggiPercorso:  async ({percorso}) => ({ data: disco[percorso] ?? null }),
    scriviPercorso: async ({percorso, data}) => { disco[percorso] = data; salva(); return { uri: uriDi(percorso) }; },
    elencaJson: async ({cartella}) => ({ files: Object.keys(disco)
      .filter(k => k.startsWith(cartella + '/') && k.endsWith('.json'))
      .map(k => ({ nome: k.slice(cartella.length + 1), uri: uriDi(k), data: disco[k] })) }),
    caricaRecensioni: async ({base}) => {
      const radice = base ? base + '/recensioni/' : 'recensioni/';
      return { recensioni: Object.keys(disco).filter(k => k.startsWith(radice)).map(k => {
        const resto = k.slice(radice.length).split('/');
        return { slug: resto[0], nome: resto[1], uri: uriDi(k), data: disco[k] };
      }) };
    },
    salvaRecensione: async ({slug, nome, data, base}) => {
      const k = (base ? base + '/' : '') + 'recensioni/' + slug + '/' + nome;
      disco[k] = data; salva(); return { uri: uriDi(k), nome };
    },
    cancellaDoc: async ({uri}) => { delete disco[percorsoDi(uri)]; salva(); return {}; },
    versioneApp: async () => ({ versione: (window.APP_VERSION || 'prova'), codice: 1 }),
    installaApkDaUrl: async () => ({ permesso:true, avviato:false }),
  } } };

  // la cartella risulta già scelta: si entra dritti alla scelta del profilo
  try { localStorage.setItem('mvna_tree', 'prova://cartella'); } catch(e){}
})();
<\/script>
`;

// lo stub deve stare PRIMA dello script dell'app, che all'avvio cerca il plugin
const segno = '<script>';
const i = app.indexOf(segno);
if (i < 0) throw new Error("non trovo lo script dell'app");
const fuori = app.slice(0, i) + stub + app.slice(i);

fs.writeFileSync(OUT, fuori, 'utf8');
console.log('scritto', path.relative(path.resolve(__dirname, '..', '..'), OUT), '—', fuori.length, 'byte');
console.log('aprilo su http://localhost:8137/app-mobile/www/prova.html');
