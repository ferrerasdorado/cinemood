package es.cinemood.tv;

import android.annotation.SuppressLint;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.view.inputmethod.InputMethodManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;

import org.json.JSONObject;

// CineMood para Android TV: interfaz web acelerada + reproductor interno nativo Media3 (ExoPlayer)
// y apertura directa en VLC cuando se solicita.
public class MainActivity extends AppCompatActivity {
    private static final String INICIO = "https://ferrerasdorado.github.io/cinemood/?tv=1";
    private static final int REQ_REPRODUCTOR = 1001;

    private static volatile MainActivity instanciaActiva;

    private WebView web;
    private FrameLayout raiz;
    private View vistaVideo;
    private WebChromeClient.CustomViewCallback cierreVideo;
    private long ultimoAtrasRaizMs = 0L;

    @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle estado) {
        super.onCreate(estado);
        instanciaActiva = this;
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        raiz = new FrameLayout(this);
        raiz.setBackgroundColor(Color.parseColor("#121413"));

        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#121413"));
        // Sin capa de hardware propia: en un WebView duplica el pintado de cada fotograma (tirones y defectos de dibujo)
        WebView.setWebContentsDebuggingEnabled(true); // solo accesible por adb con la depuración de la tele activada
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            web.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT, true);
        }

        raiz.addView(web, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        ));
        setContentView(raiz);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setLoadWithOverviewMode(false);
        s.setUseWideViewPort(true);
        s.setTextZoom(100); // que el tamaño de letra del sistema de la tele no descuadre la página
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setUserAgentString(s.getUserAgentString() + " CineMoodTV/2.0");

        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        cm.setAcceptThirdPartyCookies(web, true);

        web.addJavascriptInterface(new PuenteCineMoodTV(), "CineMoodTV");

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                String esquema = u.getScheme() == null ? "" : u.getScheme();
                String host = u.getHost() == null ? "" : u.getHost();
                if ((esquema.equals("https") || esquema.equals("http"))
                        && (host.equals("ferrerasdorado.github.io") || host.endsWith(".supabase.co"))) {
                    return false;
                }
                abrirFuera(u);
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onShowCustomView(View vista, CustomViewCallback cierre) {
                if (vistaVideo != null) {
                    cierre.onCustomViewHidden();
                    return;
                }
                vistaVideo = vista;
                cierreVideo = cierre;
                raiz.addView(vista, new FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.MATCH_PARENT
                ));
                web.setVisibility(View.GONE);
            }

            @Override
            public void onHideCustomView() {
                cerrarVideoWeb();
            }
        });

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                gestionarBotonAtras();
            }
        });

        if (estado != null) {
            web.restoreState(estado);
        } else {
            web.loadUrl(INICIO);
        }
    }

    private void gestionarBotonAtras() {
        if (vistaVideo != null) {
            cerrarVideoWeb();
            return;
        }
        web.evaluateJavascript(
                "(function(){try{return (window._cmCerrarCapaOAtras&&window._cmCerrarCapaOAtras())?'1':'0';}catch(e){return '0';}})()",
                valor -> {
                    if ("\"1\"".equals(valor)) return;
                    if (web.canGoBack()) {
                        web.goBack();
                        return;
                    }
                    long ahora = System.currentTimeMillis();
                    if (ahora - ultimoAtrasRaizMs < 2200L) {
                        finish();
                    } else {
                        ultimoAtrasRaizMs = ahora;
                        Toast.makeText(MainActivity.this,
                                "Pulsa Atrás otra vez para salir de CineMood",
                                Toast.LENGTH_SHORT).show();
                    }
                }
        );
    }

    private void cerrarVideoWeb() {
        if (vistaVideo == null) return;
        raiz.removeView(vistaVideo);
        vistaVideo = null;
        web.setVisibility(View.VISIBLE);
        if (cierreVideo != null) cierreVideo.onCustomViewHidden();
        cierreVideo = null;
    }

    public static void abrirEnVLC(Context ctx, String url, String titulo) {
        if (url == null || url.isEmpty()) return;
        try {
            Intent vlc = new Intent(Intent.ACTION_VIEW);
            vlc.setDataAndType(Uri.parse(url), "video/*");
            vlc.setPackage("org.videolan.vlc");
            if (titulo != null && !titulo.isEmpty()) {
                vlc.putExtra("title", titulo);
            }
            vlc.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            ctx.startActivity(vlc);
        } catch (Exception sinVlc) {
            try {
                Intent generico = new Intent(Intent.ACTION_VIEW);
                generico.setDataAndType(Uri.parse(url), "video/*");
                generico.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                ctx.startActivity(generico);
            } catch (Exception sinReproductor) {
                Toast.makeText(ctx,
                        "No se encontró VLC ni otro reproductor externo instalado en el televisor.",
                        Toast.LENGTH_LONG).show();
            }
        }
    }

    private void abrirFuera(Uri u) {
        if (u == null) return;
        try {
            Intent i = "intent".equals(u.getScheme())
                    ? Intent.parseUri(u.toString(), Intent.URI_INTENT_SCHEME)
                    : new Intent(Intent.ACTION_VIEW, u);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (Exception e) {
            Toast.makeText(this,
                    "No se pudo abrir la aplicación externa (comprueba que VLC esté instalado).",
                    Toast.LENGTH_LONG).show();
        }
    }

    public static void guardarProgresoEnWeb(String progKey, long posSeg, long durSeg) {
        MainActivity act = instanciaActiva;
        if (act == null || progKey == null || progKey.isEmpty()) return;
        act.runOnUiThread(() -> {
            if (act.web == null) return;
            String script = "window._cmGuardarProgresoDesdeTV&&window._cmGuardarProgresoDesdeTV("
                    + JSONObject.quote(progKey) + "," + posSeg + "," + durSeg + ");";
            act.web.evaluateJavascript(script, null);
        });
    }

    @Override
    protected void onActivityResult(int codigo, int resultado, Intent datos) {
        super.onActivityResult(codigo, resultado, datos);
        if (codigo == REQ_REPRODUCTOR && datos != null) {
            String key = datos.getStringExtra("progKey");
            long pos = datos.getLongExtra("posSeg", 0L);
            long dur = datos.getLongExtra("durSeg", 0L);
            guardarProgresoEnWeb(key, pos, dur);
        }
    }

    public final class PuenteCineMoodTV {
        @JavascriptInterface
        public void reproducir(String payloadJson) {
            if (payloadJson == null || payloadJson.isEmpty()) return;
            runOnUiThread(() -> {
                try {
                    Intent i = new Intent(MainActivity.this, PlayerActivity.class);
                    i.putExtra(PlayerActivity.EXTRA_PAYLOAD_JSON, payloadJson);
                    startActivityForResult(i, REQ_REPRODUCTOR);
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this,
                            "No se pudo abrir el reproductor interno: " + e.getMessage(),
                            Toast.LENGTH_LONG).show();
                }
            });
        }

        @JavascriptInterface
        public void anadirSubtitulos(String subtitulosJsonArray) {
            PlayerActivity.recibirSubtitulosExternos(subtitulosJsonArray);
        }

        @JavascriptInterface
        public void mostrarTeclado() {
            runOnUiThread(() -> {
                web.requestFocus();
                InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                if (imm != null) {
                    imm.showSoftInput(web, InputMethodManager.SHOW_IMPLICIT);
                }
            });
        }

        @JavascriptInterface
        public void copiar(String texto) {
            if (texto == null) return;
            runOnUiThread(() -> {
                ClipboardManager cb = (ClipboardManager) getSystemService(Context.CLIPBOARD_SERVICE);
                if (cb != null) {
                    cb.setPrimaryClip(ClipData.newPlainText("CineMood", texto));
                    Toast.makeText(MainActivity.this, "Enlace copiado al portapapeles", Toast.LENGTH_SHORT).show();
                }
            });
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle salida) {
        super.onSaveInstanceState(salida);
        if (web != null) web.saveState(salida);
    }

    @Override
    protected void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
        if (web != null) web.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        instanciaActiva = this;
        if (web != null) web.onResume();
    }

    @Override
    protected void onDestroy() {
        if (instanciaActiva == this) instanciaActiva = null;
        super.onDestroy();
    }
}
