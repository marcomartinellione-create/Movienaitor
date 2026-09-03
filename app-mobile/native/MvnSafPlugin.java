package com.movienaitor.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import androidx.documentfile.provider.DocumentFile;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * Accesso alla cartella scelta dall'utente tramite il selettore di sistema (SAF).
 * L'utente naviga tra i file del telefono e sceglie la cartella del gruppo;
 * l'app ottiene un permesso PERSISTENTE per leggerla/scriverla.
 *
 * Metodi esposti a JS (window.Capacitor.Plugins.MvnSaf):
 *  - pickFolder()          -> { uri }         (apre il selettore, prende il permesso persistente)
 *  - loadFolder({ uri })   -> { config, profili:[{name,uri,data}] }
 *  - read({ uri })         -> { data }
 *  - write({ uri, data })  -> {}
 *  - caricaRecensioni({ uri, base? })       -> { recensioni:[...] }  (base "serie" per le serie TV)
 *  - leggiPercorso({ uri, percorso })       -> { data|null }   (percorso relativo alla cartella)
 *  - scriviPercorso({ uri, percorso, data })-> { uri }         (crea le sottocartelle)
 *  - elencaJson({ uri, cartella })          -> { files:[{nome,uri,data}] }
 *  - versioneApp()                          -> { versione, codice }
 *  - installaApkDaUrl({ url })              -> { permesso, avviato }  (aggiornamento dell'APK, dall'ultima GitHub Release)
 */
@CapacitorPlugin(name = "MvnSaf")
public class MvnSafPlugin extends Plugin {

    @PluginMethod
    public void pickFolder(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
                | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, intent, "pickResult");
    }

    @ActivityCallback
    private void pickResult(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null
                || result.getData().getData() == null) {
            call.resolve(new JSObject()); // annullato: { } senza uri
            return;
        }
        Uri uri = result.getData().getData();
        try {
            final int flags = Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION;
            getContext().getContentResolver().takePersistableUriPermission(uri, flags);
        } catch (Exception e) { /* alcuni provider non lo richiedono */ }
        JSObject ret = new JSObject();
        ret.put("uri", uri.toString());
        call.resolve(ret);
    }

    @PluginMethod
    public void loadFolder(PluginCall call) {
        String uriStr = call.getString("uri");
        if (uriStr == null) { call.reject("uri mancante"); return; }
        try {
            DocumentFile root = DocumentFile.fromTreeUri(getContext(), Uri.parse(uriStr));
            if (root == null || !root.isDirectory()) { call.reject("cartella non accessibile"); return; }

            String config = null, storico = null;
            DocumentFile profiliDir = null;
            for (DocumentFile f : root.listFiles()) {
                String name = f.getName();
                if (name == null) continue;
                if (name.equals("config.json") && f.isFile()) config = readText(f.getUri());
                else if (name.equals("storico.json") && f.isFile()) storico = readText(f.getUri());
                else if (name.equals("profili") && f.isDirectory()) profiliDir = f;
            }

            JSArray profili = new JSArray();
            DocumentFile[] elenco = (profiliDir != null) ? profiliDir.listFiles() : root.listFiles();
            boolean nellaRadice = (profiliDir == null);
            for (DocumentFile f : elenco) {
                String name = f.getName();
                if (name == null || !f.isFile() || !name.endsWith(".json")) continue;
                if (nellaRadice && (name.equals("config.json") || name.equals("storico.json") || name.equals("archivio.json"))) continue;
                JSObject o = new JSObject();
                o.put("name", name);
                o.put("uri", f.getUri().toString());
                o.put("data", readText(f.getUri()));
                profili.put(o);
            }

            JSObject ret = new JSObject();
            ret.put("config", config);
            ret.put("storico", storico);
            ret.put("profili", profili);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject(e.getMessage(), e);
        }
    }

    @PluginMethod
    public void read(PluginCall call) {
        String uriStr = call.getString("uri");
        if (uriStr == null) { call.reject("uri mancante"); return; }
        try {
            JSObject o = new JSObject();
            o.put("data", readText(Uri.parse(uriStr)));
            call.resolve(o);
        } catch (Exception e) { call.reject(e.getMessage(), e); }
    }

    @PluginMethod
    public void write(PluginCall call) {
        String uriStr = call.getString("uri");
        String data = call.getString("data", "");
        if (uriStr == null) { call.reject("uri mancante"); return; }
        try {
            writeText(Uri.parse(uriStr), data);
            call.resolve(new JSObject());
        } catch (Exception e) { call.reject(e.getMessage(), e); }
    }

    // Legge tutte le recensioni: recensioni/<slug>/<nome>.json → [{slug,nome,uri,data}]
    @PluginMethod
    public void caricaRecensioni(PluginCall call) {
        String uriStr = call.getString("uri");
        if (uriStr == null) { call.reject("uri mancante"); return; }
        try {
            DocumentFile root = DocumentFile.fromTreeUri(getContext(), Uri.parse(uriStr));
            if (root == null || !root.isDirectory()) { call.reject("cartella non accessibile"); return; }
            JSArray out = new JSArray();
            // base: "" per i film (com'e' sempre stato), "serie" per le serie TV
            String base = call.getString("base", "");
            DocumentFile radice = root;
            if (base != null && !base.isEmpty()) radice = trovaFiglio(root, base);
            DocumentFile recDir = (radice == null) ? null : trovaFiglio(radice, "recensioni");
            if (recDir != null && recDir.isDirectory()) {
                for (DocumentFile userDir : recDir.listFiles()) {
                    if (userDir == null || !userDir.isDirectory()) continue;
                    String slug = userDir.getName();
                    if (slug == null) continue;
                    for (DocumentFile f : userDir.listFiles()) {
                        String name = f.getName();
                        if (name == null || !f.isFile() || !name.endsWith(".json")) continue;
                        JSObject o = new JSObject();
                        o.put("slug", slug);
                        o.put("nome", name);
                        o.put("uri", f.getUri().toString());
                        o.put("data", readText(f.getUri()));
                        out.put(o);
                    }
                }
            }
            JSObject ret = new JSObject();
            ret.put("recensioni", out);
            call.resolve(ret);
        } catch (Exception e) { call.reject(e.getMessage(), e); }
    }

    // Crea/aggiorna una recensione in recensioni/<slug>/<nome> (crea le sottocartelle se mancano)
    @PluginMethod
    public void salvaRecensione(PluginCall call) {
        String uriStr = call.getString("uri");
        String slug = call.getString("slug");
        String nome = call.getString("nome");
        String data = call.getString("data", "");
        if (uriStr == null || slug == null || nome == null) { call.reject("parametri mancanti"); return; }
        try {
            DocumentFile root = DocumentFile.fromTreeUri(getContext(), Uri.parse(uriStr));
            if (root == null) { call.reject("cartella non accessibile"); return; }
            String base = call.getString("base", "");
            DocumentFile radice = root;
            if (base != null && !base.isEmpty()) radice = trovaOCrea(root, base);
            DocumentFile recDir = trovaOCrea(radice, "recensioni");
            DocumentFile userDir = trovaOCrea(recDir, slug);
            if (userDir == null) { call.reject("impossibile creare la cartella"); return; }
            DocumentFile file = trovaFiglio(userDir, nome);
            if (file == null) {
                file = userDir.createFile("application/json", nome);
                if (file == null) { call.reject("impossibile creare il file"); return; }
            }
            writeText(file.getUri(), data);
            JSObject ret = new JSObject();
            ret.put("uri", file.getUri().toString());
            ret.put("nome", file.getName());
            call.resolve(ret);
        } catch (Exception e) { call.reject(e.getMessage(), e); }
    }

    // Legge un file per percorso relativo alla cartella scelta ("segnalazioni/marco.json").
    // Torna { data: null } se non esiste: chi chiama non deve gestire eccezioni.
    @PluginMethod
    public void leggiPercorso(PluginCall call) {
        String uriStr = call.getString("uri");
        String percorso = call.getString("percorso");
        if (uriStr == null || percorso == null) { call.reject("parametri mancanti"); return; }
        try {
            DocumentFile root = DocumentFile.fromTreeUri(getContext(), Uri.parse(uriStr));
            DocumentFile f = risolvi(root, percorso, false);
            JSObject o = new JSObject();
            o.put("data", (f != null && f.isFile()) ? readText(f.getUri()) : null);
            call.resolve(o);
        } catch (Exception e) { call.reject(e.getMessage(), e); }
    }

    // Scrive un file per percorso relativo, creando le sottocartelle mancanti.
    @PluginMethod
    public void scriviPercorso(PluginCall call) {
        String uriStr = call.getString("uri");
        String percorso = call.getString("percorso");
        String data = call.getString("data", "");
        if (uriStr == null || percorso == null) { call.reject("parametri mancanti"); return; }
        try {
            DocumentFile root = DocumentFile.fromTreeUri(getContext(), Uri.parse(uriStr));
            DocumentFile f = risolvi(root, percorso, true);
            if (f == null) { call.reject("impossibile creare il file"); return; }
            writeText(f.getUri(), data);
            JSObject o = new JSObject();
            o.put("uri", f.getUri().toString());
            call.resolve(o);
        } catch (Exception e) { call.reject(e.getMessage(), e); }
    }

    // Elenca i .json di una sottocartella → [{nome, uri, data}] (vuoto se non esiste).
    @PluginMethod
    public void elencaJson(PluginCall call) {
        String uriStr = call.getString("uri");
        String cartella = call.getString("cartella");
        if (uriStr == null || cartella == null) { call.reject("parametri mancanti"); return; }
        try {
            DocumentFile root = DocumentFile.fromTreeUri(getContext(), Uri.parse(uriStr));
            JSArray out = new JSArray();
            // risolvi() cammina sui segmenti: cosi vale anche "serie/qualcosa"
            DocumentFile dir = (root == null) ? null : risolviCartella(root, cartella);
            if (dir != null && dir.isDirectory()) {
                for (DocumentFile f : dir.listFiles()) {
                    String name = f.getName();
                    if (name == null || !f.isFile() || !name.endsWith(".json")) continue;
                    JSObject o = new JSObject();
                    o.put("nome", name);
                    o.put("uri", f.getUri().toString());
                    o.put("data", readText(f.getUri()));
                    out.put(o);
                }
            }
            JSObject ret = new JSObject();
            ret.put("files", out);
            call.resolve(ret);
        } catch (Exception e) { call.reject(e.getMessage(), e); }
    }

    // Versione installata (versionName del build.gradle), per il confronto con versione.json.
    @PluginMethod
    public void versioneApp(PluginCall call) {
        JSObject o = new JSObject();
        try {
            android.content.pm.PackageInfo pi = getContext().getPackageManager()
                    .getPackageInfo(getContext().getPackageName(), 0);
            o.put("versione", pi.versionName);
            o.put("codice", (Build.VERSION.SDK_INT >= 28) ? pi.getLongVersionCode() : pi.versionCode);
        } catch (Exception e) { o.put("versione", null); }
        call.resolve(o);
    }

    /**
     * Se manca il consenso "installa app sconosciute" apre le impostazioni e risolve
     * {permesso:false} (il chiamante deve fermarsi lì). Torna true se si può proseguire.
     */
    private boolean consensoInstallaOSpiega(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                && !getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent perm = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                    Uri.parse("package:" + getContext().getPackageName()));
            perm.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(perm);
            JSObject o = new JSObject();
            o.put("permesso", false);
            call.resolve(o);
            return false;
        }
        return true;
    }

    /** Passa un APK già scritto in cache all'installer di sistema via FileProvider:
     *  un content:// dell'installer va sempre bene, quello del provider SAF no su tutti i telefoni. */
    private void avviaInstaller(File apk, PluginCall call) throws Exception {
        Uri content = FileProvider.getUriForFile(getContext(),
                getContext().getPackageName() + ".fileprovider", apk);
        Intent i = new Intent(Intent.ACTION_VIEW);
        i.setDataAndType(content, "application/vnd.android.package-archive");
        i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(i);

        JSObject o = new JSObject();
        o.put("permesso", true);
        o.put("avviato", true);
        call.resolve(o);
    }

    private File cartellaAggiornamenti() throws Exception {
        File dir = new File(getContext().getCacheDir(), "aggiornamenti");
        if (!dir.exists() && !dir.mkdirs()) throw new Exception("cache non scrivibile");
        return dir;
    }

    /**
     * Installa un APK scaricandolo direttamente da un URL https (l'asset dell'ultima
     * GitHub Release): vale per chiunque abbia l'app, non serve una cartella condivisa.
     * Scarica nella cache dell'app e lo passa all'installer di sistema via FileProvider.
     */
    @PluginMethod
    public void installaApkDaUrl(PluginCall call) {
        String urlStr = call.getString("url");
        if (urlStr == null) { call.reject("url mancante"); return; }
        if (!urlStr.startsWith("https://")) { call.reject("url non sicuro"); return; }
        if (!consensoInstallaOSpiega(call)) return;
        // Lo scaricamento è I/O di rete: mai sul thread principale (NetworkOnMainThreadException),
        // anche se Capacitor gira già i PluginMethod fuori da lì — non do per scontato l'uno o l'altro.
        new Thread(new Runnable() { public void run() {
            try {
                File apk = new File(cartellaAggiornamenti(), "movienaitor-update.apk");
                HttpURLConnection conn = (HttpURLConnection) new URL(urlStr).openConnection();
                conn.setInstanceFollowRedirects(true);
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(30000);
                try {
                    int codice = conn.getResponseCode();
                    if (codice != HttpURLConnection.HTTP_OK) {
                        call.reject("scaricamento non riuscito: HTTP " + codice);
                        return;
                    }
                    InputStream is = conn.getInputStream();
                    try {
                        FileOutputStream os = new FileOutputStream(apk);
                        try {
                            byte[] buf = new byte[65536];
                            int n;
                            while ((n = is.read(buf)) > 0) os.write(buf, 0, n);
                        } finally { os.close(); }
                    } finally { is.close(); }
                } finally { conn.disconnect(); }

                avviaInstaller(apk, call);
            } catch (Exception e) { call.reject(e.getMessage(), e); }
        } }).start();
    }

    @PluginMethod
    public void cancellaDoc(PluginCall call) {
        String uriStr = call.getString("uri");
        if (uriStr == null) { call.reject("uri mancante"); return; }
        try {
            boolean ok = android.provider.DocumentsContract.deleteDocument(getContext().getContentResolver(), Uri.parse(uriStr));
            JSObject o = new JSObject(); o.put("ok", ok); call.resolve(o);
        } catch (Exception e) { call.reject(e.getMessage(), e); }
    }

    // Cammina un percorso di cartelle ("a/b/c"), senza crearle. Torna null se manca un pezzo.
    private DocumentFile risolviCartella(DocumentFile root, String percorso) {
        DocumentFile d = root;
        for (String parte : percorso.split("/")) {
            if (parte.isEmpty()) continue;
            if (d == null) return null;
            d = trovaFiglio(d, parte);
        }
        return d;
    }

    private DocumentFile trovaFiglio(DocumentFile parent, String nome) {
        if (parent == null) return null;
        for (DocumentFile f : parent.listFiles()) if (nome.equals(f.getName())) return f;
        return null;
    }
    // "a/b/c.json" → il DocumentFile del file, creando (se crea=true) le cartelle mancanti.
    private DocumentFile risolvi(DocumentFile root, String percorso, boolean crea) {
        if (root == null) return null;
        String[] parti = percorso.split("/");
        DocumentFile d = root;
        for (int i = 0; i < parti.length - 1; i++) {
            if (parti[i].isEmpty()) continue;
            DocumentFile n = crea ? trovaOCrea(d, parti[i]) : trovaFiglio(d, parti[i]);
            if (n == null || !n.isDirectory()) return null;
            d = n;
        }
        String nome = parti[parti.length - 1];
        DocumentFile f = trovaFiglio(d, nome);
        if (f == null && crea) f = d.createFile("application/json", nome);
        return f;
    }
    private DocumentFile trovaOCrea(DocumentFile parent, String nome) {
        DocumentFile d = trovaFiglio(parent, nome);
        if (d == null && parent != null) d = parent.createDirectory(nome);
        return d;
    }
    private void writeText(Uri uri, String data) throws Exception {
        OutputStream os = getContext().getContentResolver().openOutputStream(uri, "wt");
        if (os == null) throw new Exception("impossibile aprire il file in scrittura");
        try { os.write(data.getBytes(StandardCharsets.UTF_8)); }
        finally { os.close(); }
    }

    private String readText(Uri uri) throws Exception {
        InputStream is = getContext().getContentResolver().openInputStream(uri);
        if (is == null) throw new Exception("file non leggibile");
        try {
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = is.read(buf)) > 0) bos.write(buf, 0, n);
            return new String(bos.toByteArray(), StandardCharsets.UTF_8);
        } finally { is.close(); }
    }
}
