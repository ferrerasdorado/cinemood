package es.cinemood.tv;

import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.text.TextUtils;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.OptIn;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.TrackSelectionParameters;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.DataSource;
import androidx.media3.datasource.DefaultDataSource;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.DefaultLoadControl;
import androidx.media3.exoplayer.DefaultRenderersFactory;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector;
import androidx.media3.ui.PlayerView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

// Reproductor interno nativo con Jetpack Media3 (ExoPlayer) para Android TV:
// soporta MP4, MKV, HLS (.m3u8), DASH (.mpd), MPEG-TS (.ts/.m2ts), pistas de audio/subtítulos integradas,
// subtítulos externos de addons (.srt/.vtt), guardado de progreso y salto directo a VLC si falla un códec.
@OptIn(markerClass = UnstableApi.class)
public class PlayerActivity extends AppCompatActivity {
    public static final String EXTRA_PAYLOAD_JSON = "payload_json";

    private static volatile PlayerActivity instanciaActiva;

    private static final class SubExterno {
        final String url;
        final String lang;
        final String label;

        SubExterno(String url, String lang, String label) {
            this.url = url;
            this.lang = lang;
            this.label = label;
        }
    }

    private ExoPlayer player;
    private PlayerView playerView;
    private LinearLayout barraSuperior;
    private Button btnSubExternos;
    private Button btnAbrirVlc;
    private Button btnCerrar;
    private ProgressBar spinnerCarga;

    private String streamUrl = "";
    private String titulo = "CineMood";
    private String subtitulo = "";
    private String progKey = "";
    private long posicionInicialMs = 0L;
    private final Map<String, String> headersStream = new HashMap<>();
    private final List<SubExterno> subtitulosExternos = new ArrayList<>();
    private Uri subtituloLocalActivo = null;
    private String idiomaSubLocalActivo = "es";
    private String etiquetaSubLocalActivo = "Subtítulo externo";

    @Override
    protected void onCreate(Bundle estado) {
        super.onCreate(estado);
        instanciaActiva = this;
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        leerPayload();
        if (estado != null) {
            posicionInicialMs = estado.getLong("posMs", posicionInicialMs);
        }

        construirInterfaz();
        iniciarReproductor();

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (playerView != null && playerView.isControllerFullyVisible()) {
                    playerView.hideController();
                } else {
                    cerrarGuardandoProgreso();
                }
            }
        });
    }

    private void leerPayload() {
        String raw = getIntent() != null ? getIntent().getStringExtra(EXTRA_PAYLOAD_JSON) : null;
        if (raw == null || raw.isEmpty()) return;
        try {
            JSONObject obj = new JSONObject(raw);
            streamUrl = obj.optString("url", "");
            titulo = obj.optString("titulo", "CineMood");
            subtitulo = obj.optString("subtitulo", "");
            progKey = obj.optString("progKey", "");
            long iniSeg = Math.max(0L, obj.optLong("inicioSeg", 0L));
            posicionInicialMs = iniSeg * 1000L;

            JSONObject hdrs = obj.optJSONObject("headers");
            if (hdrs != null) {
                Iterator<String> it = hdrs.keys();
                while (it.hasNext()) {
                    String k = it.next();
                    String v = hdrs.optString(k, "");
                    if (!k.isEmpty() && !v.isEmpty()) headersStream.put(k, v);
                }
            }

            agregarListaSubtitulosJson(obj.optJSONArray("subtitulos"));
        } catch (Exception ignored) {
        }
    }

    private void agregarListaSubtitulosJson(JSONArray arr) {
        if (arr == null) return;
        synchronized (subtitulosExternos) {
            for (int i = 0; i < arr.length(); i++) {
                JSONObject s = arr.optJSONObject(i);
                if (s == null) continue;
                String u = s.optString("url", "").trim();
                if (u.isEmpty()) continue;
                boolean repetido = false;
                for (SubExterno ex : subtitulosExternos) {
                    if (ex.url.equals(u)) {
                        repetido = true;
                        break;
                    }
                }
                if (!repetido) {
                    String lang = s.optString("lang", "es").trim();
                    String label = s.optString("label", lang.isEmpty() ? "Subtítulo" : lang).trim();
                    subtitulosExternos.add(new SubExterno(u, lang.isEmpty() ? "und" : lang, label));
                }
            }
        }
    }

    public static void recibirSubtitulosExternos(String jsonArray) {
        PlayerActivity act = instanciaActiva;
        if (act == null || jsonArray == null || jsonArray.isEmpty()) return;
        try {
            JSONArray arr = new JSONArray(jsonArray);
            act.agregarListaSubtitulosJson(arr);
            act.runOnUiThread(act::actualizarBotonSubtitulosExternos);
        } catch (Exception ignored) {
        }
    }

    private int dp(int v) {
        return Math.round(TypedValue.applyDimension(
                TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics()));
    }

    private Button crearBotonSuperior(String texto) {
        Button b = new Button(this);
        b.setAllCaps(false);
        b.setText(texto);
        b.setTextColor(Color.WHITE);
        b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 14);
        b.setPadding(dp(14), dp(8), dp(14), dp(8));
        GradientDrawable fondo = new GradientDrawable();
        fondo.setColor(Color.argb(190, 28, 31, 30));
        fondo.setCornerRadius(dp(8));
        fondo.setStroke(dp(1), Color.argb(120, 255, 255, 255));
        b.setBackground(fondo);
        b.setFocusable(true);
        b.setOnFocusChangeListener((v, foco) -> {
            GradientDrawable g = new GradientDrawable();
            g.setColor(foco ? Color.rgb(212, 162, 76) : Color.argb(190, 28, 31, 30));
            g.setCornerRadius(dp(8));
            g.setStroke(dp(2), foco ? Color.WHITE : Color.argb(120, 255, 255, 255));
            b.setBackground(g);
            b.setTextColor(foco ? Color.BLACK : Color.WHITE);
        });
        return b;
    }

    private void construirInterfaz() {
        FrameLayout cont = new FrameLayout(this);
        cont.setBackgroundColor(Color.BLACK);

        playerView = new PlayerView(this);
        playerView.setBackgroundColor(Color.BLACK);
        playerView.setUseController(true);
        playerView.setShowSubtitleButton(true);
        playerView.setControllerShowTimeoutMs(4500);
        playerView.setControllerHideOnTouch(true);
        cont.addView(playerView, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
        ));

        spinnerCarga = new ProgressBar(this);
        FrameLayout.LayoutParams lpSpin = new FrameLayout.LayoutParams(dp(52), dp(52), Gravity.CENTER);
        cont.addView(spinnerCarga, lpSpin);

        barraSuperior = new LinearLayout(this);
        barraSuperior.setOrientation(LinearLayout.HORIZONTAL);
        barraSuperior.setGravity(Gravity.CENTER_VERTICAL);
        barraSuperior.setPadding(dp(24), dp(18), dp(24), dp(16));
        GradientDrawable deg = new GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                new int[]{Color.argb(210, 0, 0, 0), Color.TRANSPARENT}
        );
        barraSuperior.setBackground(deg);

        LinearLayout cajaTexto = new LinearLayout(this);
        cajaTexto.setOrientation(LinearLayout.VERTICAL);
        LinearLayout.LayoutParams lpTxt = new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        lpTxt.rightMargin = dp(16);

        TextView tvTit = new TextView(this);
        tvTit.setText(titulo);
        tvTit.setTextColor(Color.WHITE);
        tvTit.setTextSize(TypedValue.COMPLEX_UNIT_SP, 19);
        tvTit.setTypeface(Typeface.DEFAULT_BOLD);
        tvTit.setMaxLines(1);
        tvTit.setEllipsize(TextUtils.TruncateAt.END);
        cajaTexto.addView(tvTit);

        if (!subtitulo.isEmpty()) {
            TextView tvSub = new TextView(this);
            tvSub.setText(subtitulo);
            tvSub.setTextColor(Color.argb(200, 235, 235, 235));
            tvSub.setTextSize(TypedValue.COMPLEX_UNIT_SP, 13);
            tvSub.setMaxLines(1);
            tvSub.setEllipsize(TextUtils.TruncateAt.END);
            cajaTexto.addView(tvSub);
        }
        barraSuperior.addView(cajaTexto, lpTxt);

        btnSubExternos = crearBotonSuperior("Subtítulos addons");
        btnSubExternos.setOnClickListener(v -> mostrarSelectorSubtitulosExternos());
        LinearLayout.LayoutParams lpBtn1 = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lpBtn1.rightMargin = dp(10);
        barraSuperior.addView(btnSubExternos, lpBtn1);

        btnAbrirVlc = crearBotonSuperior("Abrir en VLC");
        btnAbrirVlc.setOnClickListener(v -> {
            guardarProgresoActual();
            if (player != null) player.pause();
            MainActivity.abrirEnVLC(this, streamUrl, titulo);
        });
        LinearLayout.LayoutParams lpBtn2 = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lpBtn2.rightMargin = dp(10);
        barraSuperior.addView(btnAbrirVlc, lpBtn2);

        btnCerrar = crearBotonSuperior("Cerrar");
        btnCerrar.setOnClickListener(v -> cerrarGuardandoProgreso());
        barraSuperior.addView(btnCerrar);

        cont.addView(barraSuperior, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.TOP
        ));

        playerView.setControllerVisibilityListener((PlayerView.ControllerVisibilityListener) visibility -> {
            barraSuperior.setVisibility(visibility == View.VISIBLE ? View.VISIBLE : View.GONE);
        });

        actualizarBotonSubtitulosExternos();
        setContentView(cont);
    }

    private void actualizarBotonSubtitulosExternos() {
        if (btnSubExternos == null) return;
        int n;
        synchronized (subtitulosExternos) {
            n = subtitulosExternos.size();
        }
        if (n > 0) {
            btnSubExternos.setVisibility(View.VISIBLE);
            btnSubExternos.setText("Subtítulos addons (" + n + ")");
        } else {
            btnSubExternos.setVisibility(View.GONE);
        }
    }

    private MediaItem construirMediaItem() {
        MediaItem.Builder b = new MediaItem.Builder().setUri(Uri.parse(streamUrl));
        String lower = streamUrl.toLowerCase();
        if (lower.contains(".m3u8") || lower.contains("format=hls")) {
            b.setMimeType(MimeTypes.APPLICATION_M3U8);
        } else if (lower.contains(".mpd")) {
            b.setMimeType(MimeTypes.APPLICATION_MPD);
        }
        if (subtituloLocalActivo != null) {
            MediaItem.SubtitleConfiguration subCfg = new MediaItem.SubtitleConfiguration.Builder(subtituloLocalActivo)
                    .setMimeType(MimeTypes.TEXT_VTT)
                    .setLanguage(idiomaSubLocalActivo)
                    .setLabel(etiquetaSubLocalActivo)
                    .setSelectionFlags(C.SELECTION_FLAG_DEFAULT)
                    .build();
            List<MediaItem.SubtitleConfiguration> lista = new ArrayList<>();
            lista.add(subCfg);
            b.setSubtitleConfigurations(lista);
        }
        return b.build();
    }

    private void iniciarReproductor() {
        if (streamUrl == null || streamUrl.isEmpty()) {
            Toast.makeText(this, "Dirección de vídeo vacía", Toast.LENGTH_LONG).show();
            finish();
            return;
        }

        DefaultHttpDataSource.Factory httpFactory = new DefaultHttpDataSource.Factory()
                .setUserAgent("CineMoodTV/2.0 (AndroidTV; Media3)")
                .setAllowCrossProtocolRedirects(true)
                .setConnectTimeoutMs(20000)
                .setReadTimeoutMs(25000);
        if (!headersStream.isEmpty()) {
            httpFactory.setDefaultRequestProperties(headersStream);
        }
        DataSource.Factory dataSourceFactory = new DefaultDataSource.Factory(this, httpFactory);

        DefaultRenderersFactory renderers = new DefaultRenderersFactory(this)
                .setExtensionRendererMode(DefaultRenderersFactory.EXTENSION_RENDERER_MODE_PREFER)
                .setEnableDecoderFallback(true);

        DefaultTrackSelector trackSelector = new DefaultTrackSelector(this);
        TrackSelectionParameters params = trackSelector.buildUponParameters()
                .setPreferredAudioLanguage("es")
                .setPreferredTextLanguage("es")
                .build();
        trackSelector.setParameters(params);

        DefaultLoadControl loadControl = new DefaultLoadControl.Builder()
                .setBufferDurationsMs(15000, 60000, 2000, 4500)
                .build();

        AudioAttributes audioAttr = new AudioAttributes.Builder()
                .setUsage(C.USAGE_MEDIA)
                .setContentType(C.AUDIO_CONTENT_TYPE_MOVIE)
                .build();

        player = new ExoPlayer.Builder(this, renderers)
                .setMediaSourceFactory(new DefaultMediaSourceFactory(dataSourceFactory))
                .setTrackSelector(trackSelector)
                .setLoadControl(loadControl)
                .setAudioAttributes(audioAttr, true)
                .setHandleAudioBecomingNoisy(true)
                .build();

        playerView.setPlayer(player);

        player.addListener(new Player.Listener() {
            @Override
            public void onPlaybackStateChanged(int playbackState) {
                if (spinnerCarga != null) {
                    spinnerCarga.setVisibility(playbackState == Player.STATE_BUFFERING ? View.VISIBLE : View.GONE);
                }
                if (playbackState == Player.STATE_ENDED) {
                    guardarProgresoActual();
                }
            }

            @Override
            public void onPlayerError(PlaybackException error) {
                if (spinnerCarga != null) spinnerCarga.setVisibility(View.GONE);
                mostrarDialogoErrorReproduccion(error);
            }
        });

        player.setMediaItem(construirMediaItem(), Math.max(0L, posicionInicialMs));
        player.prepare();
        player.setPlayWhenReady(true);
    }

    private void mostrarDialogoErrorReproduccion(PlaybackException error) {
        if (isFinishing()) return;
        String detalle = error != null && error.getErrorCodeName() != null
                ? error.getErrorCodeName()
                : "Formato o red no disponible";
        new AlertDialog.Builder(this)
                .setTitle("No se pudo reproducir en el reproductor interno")
                .setMessage("Detalle técnico: " + detalle + "\n\nPuedes abrir este enlace directamente en VLC sin salir de CineMood.")
                .setPositiveButton("Abrir en VLC", (d, w) -> {
                    MainActivity.abrirEnVLC(this, streamUrl, titulo);
                    cerrarGuardandoProgreso();
                })
                .setNeutralButton("Reintentar", (d, w) -> {
                    if (player != null) {
                        long pos = Math.max(0L, player.getCurrentPosition());
                        player.setMediaItem(construirMediaItem(), pos);
                        player.prepare();
                        player.setPlayWhenReady(true);
                    }
                })
                .setNegativeButton("Volver a fuentes", (d, w) -> cerrarGuardandoProgreso())
                .show();
    }

    private void mostrarSelectorSubtitulosExternos() {
        final List<SubExterno> copia;
        synchronized (subtitulosExternos) {
            copia = new ArrayList<>(subtitulosExternos);
        }
        if (copia.isEmpty()) {
            Toast.makeText(this, "No hay subtítulos externos de addons para este título.", Toast.LENGTH_SHORT).show();
            return;
        }
        String[] etiquetas = new String[copia.size() + 1];
        etiquetas[0] = "Desactivar subtítulo externo de addon";
        for (int i = 0; i < copia.size(); i++) {
            etiquetas[i + 1] = copia.get(i).label;
        }
        new AlertDialog.Builder(this)
                .setTitle("Subtítulos de tus addons")
                .setItems(etiquetas, (d, idx) -> {
                    if (idx == 0) {
                        desactivarSubtituloExterno();
                    } else {
                        descargarYAplicarSubtitulo(copia.get(idx - 1));
                    }
                })
                .setNegativeButton("Cancelar", null)
                .show();
    }

    private void desactivarSubtituloExterno() {
        subtituloLocalActivo = null;
        if (player == null) return;
        long pos = Math.max(0L, player.getCurrentPosition());
        boolean jugando = player.getPlayWhenReady();
        player.setMediaItem(construirMediaItem(), pos);
        player.prepare();
        player.setPlayWhenReady(jugando);
        Toast.makeText(this, "Subtítulo externo desactivado", Toast.LENGTH_SHORT).show();
    }

    private void descargarYAplicarSubtitulo(SubExterno sub) {
        Toast.makeText(this, "Descargando subtítulo…", Toast.LENGTH_SHORT).show();
        new Thread(() -> {
            HttpURLConnection conn = null;
            try {
                URL u = new URL(sub.url);
                conn = (HttpURLConnection) u.openConnection();
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(15000);
                conn.setInstanceFollowRedirects(true);
                conn.setRequestProperty("User-Agent", "CineMoodTV/2.0");
                int code = conn.getResponseCode();
                if (code < 200 || code >= 300) throw new Exception("HTTP " + code);

                ByteArrayOutputStream bos = new ByteArrayOutputStream();
                try (InputStream in = conn.getInputStream()) {
                    byte[] buf = new byte[8192];
                    int n;
                    while ((n = in.read(buf)) != -1) {
                        bos.write(buf, 0, n);
                        if (bos.size() > 5_000_000) throw new Exception("Archivo demasiado grande");
                    }
                }
                byte[] bytes = bos.toByteArray();
                String txt = new String(bytes, StandardCharsets.UTF_8);
                if (txt.indexOf('\uFFFD') >= 0) {
                    txt = new String(bytes, Charset.forName("windows-1252"));
                }
                txt = txt.replace("\uFEFF", "").replace("\r\n", "\n").replace("\r", "\n").trim();
                if (!txt.startsWith("WEBVTT")) {
                    // Conversión rápida y limpia de SRT a WebVTT
                    String vtt = txt.replaceAll("(?m)^\\d+\\s*\\n(?=\\d{1,2}:)", "")
                            .replaceAll("(\\d{1,2}:\\d{2}:\\d{2}),(\\d{3})", "$1.$2");
                    txt = "WEBVTT\n\n" + vtt;
                }
                File out = new File(getCacheDir(), "cm_sub_activo.vtt");
                try (FileOutputStream fos = new FileOutputStream(out)) {
                    fos.write(txt.getBytes(StandardCharsets.UTF_8));
                }

                runOnUiThread(() -> {
                    if (isFinishing() || player == null) return;
                    subtituloLocalActivo = Uri.fromFile(out);
                    idiomaSubLocalActivo = sub.lang;
                    etiquetaSubLocalActivo = sub.label;
                    long pos = Math.max(0L, player.getCurrentPosition());
                    boolean jugando = player.getPlayWhenReady();
                    player.setTrackSelectionParameters(
                            player.getTrackSelectionParameters()
                                    .buildUpon()
                                    .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false)
                                    .setPreferredTextLanguage(sub.lang)
                                    .build()
                    );
                    player.setMediaItem(construirMediaItem(), pos);
                    player.prepare();
                    player.setPlayWhenReady(jugando);
                    Toast.makeText(PlayerActivity.this,
                            "Subtítulo activado: " + sub.label,
                            Toast.LENGTH_SHORT).show();
                });
            } catch (Exception e) {
                runOnUiThread(() -> Toast.makeText(PlayerActivity.this,
                        "No se pudo cargar ese subtítulo (" + e.getMessage() + "). Prueba otro de la lista.",
                        Toast.LENGTH_LONG).show());
            } finally {
                if (conn != null) conn.disconnect();
            }
        }).start();
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getAction() == KeyEvent.ACTION_DOWN && player != null && playerView != null) {
            int kc = event.getKeyCode();
            boolean controlesVisibles = playerView.isControllerFullyVisible();
            if (!controlesVisibles) {
                if (kc == KeyEvent.KEYCODE_DPAD_LEFT) {
                    long destino = Math.max(0L, player.getCurrentPosition() - 10_000L);
                    player.seekTo(destino);
                    playerView.showController();
                    return true;
                }
                if (kc == KeyEvent.KEYCODE_DPAD_RIGHT) {
                    long dur = player.getDuration();
                    long destino = player.getCurrentPosition() + 10_000L;
                    if (dur != C.TIME_UNSET && dur > 0) destino = Math.min(dur, destino);
                    player.seekTo(destino);
                    playerView.showController();
                    return true;
                }
                if (kc == KeyEvent.KEYCODE_DPAD_CENTER || kc == KeyEvent.KEYCODE_ENTER) {
                    if (player.isPlaying()) player.pause();
                    else player.play();
                    playerView.showController();
                    return true;
                }
                if (kc == KeyEvent.KEYCODE_DPAD_UP || kc == KeyEvent.KEYCODE_DPAD_DOWN) {
                    playerView.showController();
                    return true;
                }
            }
        }
        return super.dispatchKeyEvent(event);
    }

    private void guardarProgresoActual() {
        if (player == null || progKey == null || progKey.isEmpty()) return;
        long posSeg = Math.max(0L, player.getCurrentPosition() / 1000L);
        long durMs = player.getDuration();
        long durSeg = (durMs != C.TIME_UNSET && durMs > 0) ? (durMs / 1000L) : 0L;
        MainActivity.guardarProgresoEnWeb(progKey, posSeg, durSeg);
        Intent datos = new Intent();
        datos.putExtra("progKey", progKey);
        datos.putExtra("posSeg", posSeg);
        datos.putExtra("durSeg", durSeg);
        setResult(RESULT_OK, datos);
    }

    private void cerrarGuardandoProgreso() {
        guardarProgresoActual();
        finish();
    }

    @Override
    protected void onSaveInstanceState(Bundle salida) {
        super.onSaveInstanceState(salida);
        if (player != null) {
            salida.putLong("posMs", Math.max(0L, player.getCurrentPosition()));
        }
    }

    @Override
    protected void onStop() {
        guardarProgresoActual();
        if (player != null) {
            player.pause();
        }
        super.onStop();
    }

    @Override
    protected void onDestroy() {
        if (instanciaActiva == this) instanciaActiva = null;
        if (player != null) {
            player.release();
            player = null;
        }
        super.onDestroy();
    }
}
