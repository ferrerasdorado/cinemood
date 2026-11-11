package es.cinemood.tv;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

// CineMood para Android TV: abre la web en pantalla completa (modo TV), con el botón «atrás» del mando
// y los vídeos a pantalla completa. Los enlaces de VLC u otras apps se abren fuera.
public class MainActivity extends Activity {
    private static final String INICIO = "https://ferrerasdorado.github.io/cinemood/?tv=1";
    private WebView web;
    private FrameLayout raiz;
    private View vistaVideo;
    private WebChromeClient.CustomViewCallback cierreVideo;

    @Override
    protected void onCreate(Bundle estado) {
        super.onCreate(estado);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        raiz = new FrameLayout(this);
        raiz.setBackgroundColor(Color.parseColor("#121413"));
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#121413"));
        raiz.addView(web, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(raiz);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setUserAgentString(s.getUserAgentString() + " CineMoodTV");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                String esquema = u.getScheme() == null ? "" : u.getScheme();
                String host = u.getHost() == null ? "" : u.getHost();
                if ((esquema.equals("https") || esquema.equals("http")) && (host.equals("ferrerasdorado.github.io") || host.endsWith(".supabase.co"))) return false;
                abrirFuera(u);
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onShowCustomView(View vista, CustomViewCallback cierre) {
                if (vistaVideo != null) { cierre.onCustomViewHidden(); return; }
                vistaVideo = vista; cierreVideo = cierre;
                raiz.addView(vista, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
                web.setVisibility(View.GONE);
            }
            @Override
            public void onHideCustomView() { cerrarVideo(); }
        });

        if (estado != null) web.restoreState(estado); else web.loadUrl(INICIO);
    }

    private void cerrarVideo() {
        if (vistaVideo == null) return;
        raiz.removeView(vistaVideo);
        vistaVideo = null;
        web.setVisibility(View.VISIBLE);
        if (cierreVideo != null) cierreVideo.onCustomViewHidden();
        cierreVideo = null;
    }

    private void abrirFuera(Uri u) {
        try {
            Intent i = "intent".equals(u.getScheme()) ? Intent.parseUri(u.toString(), Intent.URI_INTENT_SCHEME) : new Intent(Intent.ACTION_VIEW, u);
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (Exception e) {
            // sin app que lo abra (p. ej. VLC no instalado): no se hace nada
        }
    }

    @Override
    public void onBackPressed() {
        if (vistaVideo != null) cerrarVideo();
        else if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle salida) {
        super.onSaveInstanceState(salida);
        web.saveState(salida);
    }

    @Override
    protected void onPause() { super.onPause(); web.onPause(); }

    @Override
    protected void onResume() { super.onResume(); web.onResume(); }
}
