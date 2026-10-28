// Planning de stream, lu sur l'API publique du site du planning (planning-live).
//
// Ce site n'autorise pas les appels venant d'autres sites (pas de CORS) : le serveur de
// l'extension le lit a sa place et renvoie les 7 prochains jours, deja prepares pour l'onglet.
// Un changement fait dans l'editeur du planning apparait donc ici en moins d'une minute.
import { SITE_CONFIG } from "./site-config.js";

const DOW = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const DAY_MS = 86400000;
const DAYS = 7; // aujourd'hui + les 6 jours suivants
// Comme sur le site du planning : la journee de stream bascule a 6 h (heure de Paris),
// pas a minuit (un live qui finit a 3 h appartient encore a la veille).
const SWITCH_HOUR = 6;
const CACHE_MS = 60000;
const MAX_SESSIONS = 6;
const POS = /^\d{1,3}(\.\d+)?% \d{1,3}(\.\d+)?%$/;

export function planningApiUrl() {
  return new URL("/api/planning", SITE_CONFIG.planningUrl).href;
}

// Date (AAAA-MM-JJ) de la journee de stream en cours a Paris.
export function parisTodayISO(now = Date.now()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit"
  }).format(new Date(now - SWITCH_HOUR * 3600000));
}

// Decale une date de n jours (calcul a midi UTC : pas d'effet des changements d'heure).
export function shiftISO(iso, n) {
  const [y, m, d] = String(iso).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12) + n * DAY_MS).toISOString().slice(0, 10);
}

function httpsUrl(u) {
  try {
    const x = new URL(String(u));
    return x.protocol === "https:" ? x.href : null;
  } catch (_) {
    return null;
  }
}

// Contenu brut d'une date. Format actuel : planning.jours[date]. Repli sur l'ancien format
// (une cle par jour de la semaine, horodatee par planning.dates).
function rawDay(planning, iso, dayName) {
  const byDate = planning && planning.jours;
  if (byDate && typeof byDate === "object") {
    const d = byDate[iso] || {};
    return { sessions: Array.isArray(d.sessions) ? d.sessions : [], rest: d.repos };
  }
  const stamp = planning && planning.dates ? String(planning.dates[dayName] || "") : "";
  if (!stamp || stamp !== iso) return { sessions: [], rest: "" };
  return {
    sessions: Array.isArray(planning[dayName]) ? planning[dayName] : [],
    rest: planning.repos ? planning.repos[dayName] : ""
  };
}

// Les 7 jours a afficher, aujourd'hui en premier.
export function buildWeek(planning, now = Date.now()) {
  const today = parisTodayISO(now);
  const days = [];
  for (let i = 0; i < DAYS; i++) {
    const iso = shiftISO(today, i);
    const day = DOW[new Date(iso + "T12:00:00Z").getUTCDay()];
    const raw = rawDay(planning, iso, day);
    const sessions = raw.sessions
      .filter((s) => s && typeof s === "object")
      .map((s) => ({
        image: httpsUrl(s.image),
        time: String(s.heure || "").trim().slice(0, 24),
        pos: POS.test(String(s.pos || "")) ? s.pos : "50% 50%"
      }))
      .filter((s) => s.image || s.time)
      .slice(0, MAX_SESSIONS);
    days.push({
      iso,
      day,
      date: iso.slice(8, 10) + "/" + iso.slice(5, 7),
      today: i === 0,
      sessions,
      rest: sessions.length ? "" : String(raw.rest || "").trim().slice(0, 40)
    });
  }
  return days;
}

// Le planning brut est garde 1 min en memoire ; les 7 jours sont recalcules a chaque appel
// (pour que la bascule de 6 h soit toujours juste).
let cache = { at: 0, raw: null };

export async function getPlanning(force = false) {
  if (force || !cache.raw || Date.now() - cache.at > CACHE_MS) {
    try {
      const r = await fetch(planningApiUrl(), { signal: AbortSignal.timeout(6000) });
      if (!r.ok) throw new Error("planning " + r.status);
      const raw = await r.json();
      if (!raw || typeof raw !== "object") throw new Error("planning illisible");
      cache = { at: Date.now(), raw };
    } catch (e) {
      // Site du planning en panne : on garde la derniere version connue si on en a une.
      if (!cache.raw) throw e;
    }
  }
  return { days: buildWeek(cache.raw) };
}
