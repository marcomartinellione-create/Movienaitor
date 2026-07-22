// Ponte sicuro renderer ↔ main (contextIsolation + sandbox).
// Espone solo le operazioni sulla cartella condivisa: nessun accesso diretto a Node.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mvnFS', {
  scegliCartella:    ()        => ipcRenderer.invoke('mvn:scegli'),
  cartellaCorrente:  ()        => ipcRenderer.invoke('mvn:corrente'),
  readJSON:          (rel)     => ipcRenderer.invoke('mvn:readJSON', rel),
  writeJSON:         (rel, o)  => ipcRenderer.invoke('mvn:writeJSON', rel, o),
  writeBlob:         (rel, b)  => ipcRenderer.invoke('mvn:writeBlob', rel, b),
  list:              (rel)     => ipcRenderer.invoke('mvn:list', rel),
  fileURL:           (rel)     => ipcRenderer.invoke('mvn:fileURL', rel),
  scaricaImmagine:   (url,rel) => ipcRenderer.invoke('mvn:scarica', url, rel),
  profiloRicordato:  ()        => ipcRenderer.invoke('mvn:getMe'),
  ricordaProfilo:    (slug)    => ipcRenderer.invoke('mvn:setMe', slug),
  hostRicordato:     ()        => ipcRenderer.invoke('mvn:getHost'),
  ricordaHost:       (on)      => ipcRenderer.invoke('mvn:setHost', on),
  apriReleases:      ()        => ipcRenderer.invoke('mvn:releases'),
  versione:          ()        => ipcRenderer.invoke('mvn:versione')
});

contextBridge.exposeInMainWorld('mvnUpdate', {
  onEvento: (cb) => ipcRenderer.on('mvn-update', (e, d) => cb(d)),
  azione:   (a)  => ipcRenderer.send('mvn-update-azione', a)
});
