package com.movienaitor.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;

import androidx.activity.result.ActivityResult;
import androidx.documentfile.provider.DocumentFile;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
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
            DocumentFile recDir = trovaFiglio(root, "recensioni");
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
            DocumentFile recDir = trovaOCrea(root, "recensioni");
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

    @PluginMethod
    public void cancellaDoc(PluginCall call) {
        String uriStr = call.getString("uri");
        if (uriStr == null) { call.reject("uri mancante"); return; }
        try {
            boolean ok = android.provider.DocumentsContract.deleteDocument(getContext().getContentResolver(), Uri.parse(uriStr));
            JSObject o = new JSObject(); o.put("ok", ok); call.resolve(o);
        } catch (Exception e) { call.reject(e.getMessage(), e); }
    }

    private DocumentFile trovaFiglio(DocumentFile parent, String nome) {
        if (parent == null) return null;
        for (DocumentFile f : parent.listFiles()) if (nome.equals(f.getName())) return f;
        return null;
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
