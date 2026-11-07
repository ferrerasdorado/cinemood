// Top 10 semanal de Netflix por país (datos públicos de Netflix: top10.netflix.com).
// El fichero oficial pesa ~30 MB y no permite peticiones desde el navegador (sin CORS),
// así que esta función lo lee en streaming, se queda solo con la última semana de los países
// que usa CineMood y guarda el resultado en memoria unas horas.
//
// Petición: POST {"pais":"ES"}  →  {pais, semana, peliculas:[{puesto,titulo}], series:[{puesto,titulo,temporada}]}

const FUENTE = "https://www.netflix.com/tudum/top10/data/all-weeks-countries.tsv";
const PAISES = new Set(["ES", "US"]);
const CACHE_MS = 6 * 60 * 60 * 1000;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Fila = { puesto: number; titulo: string; temporada?: string };
type Top = { pais: string; semana: string; peliculas: Fila[]; series: Fila[] };

let cache: { ts: number; datos: Record<string, Top> } | null = null;

async function cargar(): Promise<Record<string, Top>> {
  if (cache && Date.now() - cache.ts < CACHE_MS) return cache.datos;
  const r = await fetch(FUENTE);
  if (!r.ok || !r.body) throw new Error("Netflix respondió " + r.status);
  const datos: Record<string, Top> = {};
  let resto = "";
  const lector = r.body.pipeThrough(new TextDecoderStream()).getReader();
  const procesar = (linea: string) => {
    // country_name, country_iso2, week, category, weekly_rank, show_title, season_title, cumulative_weeks_in_top_10
    const c = linea.split("\t");
    if (c.length < 7 || !PAISES.has(c[1])) return;
    const [, pais, semana, categoria, puesto, titulo, temporada] = c;
    const t = datos[pais];
    if (!t || semana > t.semana) datos[pais] = { pais, semana, peliculas: [], series: [] };
    else if (semana < t.semana) return;
    const fila: Fila = { puesto: Number(puesto), titulo };
    if (categoria === "TV") {
      if (temporada && temporada !== "N/A") fila.temporada = temporada;
      datos[pais].series.push(fila);
    } else datos[pais].peliculas.push(fila);
  };
  while (true) {
    const { value, done } = await lector.read();
    if (done) break;
    const lineas = (resto + value).split("\n");
    resto = lineas.pop() ?? "";
    lineas.forEach(procesar);
  }
  if (resto) procesar(resto);
  for (const t of Object.values(datos)) {
    t.peliculas.sort((a, b) => a.puesto - b.puesto);
    t.series.sort((a, b) => a.puesto - b.puesto);
  }
  cache = { ts: Date.now(), datos };
  return datos;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const json = (cuerpo: unknown, status = 200) =>
    new Response(JSON.stringify(cuerpo), { status, headers: { ...CORS, "Content-Type": "application/json" } });
  try {
    const { pais } = await req.json().catch(() => ({}));
    if (!PAISES.has(pais)) return json({ error: "País no admitido" }, 400);
    const top = (await cargar())[pais];
    if (!top) return json({ error: "Netflix no tiene datos de ese país" }, 404);
    return json(top);
  } catch (e) {
    return json({ error: "No se pudo leer el Top 10 de Netflix: " + (e as Error).message }, 502);
  }
});
