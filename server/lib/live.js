// Live Patreon : etat stocke dans Supabase (ext_patreon_live), pilote depuis la page privee
// /live-patreon (et plus tard par la detection automatique, voir lib/patreon-log.js).
import { storeEnabled, readLive, writeLive } from "./store.js";
import { SITE_CONFIG } from "./site-config.js";

// Patreon coupe un direct au bout de 12 h : au-dela, on considere le live termine (oubli du bouton).
const MAX_LIVE_MS = 12 * 3600000;
const CACHE_MS = 15000;

let cache = { at: 0, value: null };

export function patreonPageUrl() {
  const s = (SITE_CONFIG.socials || []).find((x) => x.icon === "patreon");
  return (s && s.url) || "https://www.patreon.com";
}

// N'accepte qu'un lien https vers patreon.com (le lien est affiche a toute la communaute).
export function safePatreonUrl(u) {
  try {
    const x = new URL(String(u || "").trim());
    const okHost = x.hostname === "patreon.com" || x.hostname.endsWith(".patreon.com");
    return x.protocol === "https:" && okHost ? x.href : null;
  } catch (_) {
    return null;
  }
}

function toLive(row) {
  return {
    platform: "patreon",
    title: row.title || "Live sur Patreon",
    url: safePatreonUrl(row.url) || patreonPageUrl(),
    startedAt: row.started_at || null,
    source: row.source || "manuel"
  };
}

// Live Patreon en cours, ou null. Ne leve jamais d'erreur (le statut Twitch ne doit pas en patir).
export async function getPatreonLive(fresh) {
  if (!storeEnabled) return null;
  if (!fresh && Date.now() - cache.at < CACHE_MS) return cache.value;
  let value = null;
  try {
    const row = await readLive();
    if (row.is_live) {
      const started = row.started_at ? Date.parse(row.started_at) : 0;
      if (started && Date.now() - started > MAX_LIVE_MS) {
        await writeLive({ is_live: false, ended_at: new Date().toISOString(), updated_by: "fin automatique (12 h)" });
      } else {
        value = toLive(row);
      }
    }
  } catch (e) {
    console.warn("live patreon :", e.message);
    value = cache.value; // on garde la derniere valeur connue
  }
  cache = { at: Date.now(), value };
  return value;
}

export async function readLiveRow() {
  return readLive();
}

export async function startPatreonLive({ title, url, by, source = "manuel" }) {
  const row = await readLive();
  const patch = {
    is_live: true,
    title: String(title || "").trim().slice(0, 140) || null,
    url: safePatreonUrl(url),
    source,
    updated_by: by || null
  };
  // Un live deja en cours garde son heure de debut (on ne fait que corriger le titre ou le lien).
  if (!row.is_live) {
    patch.started_at = new Date().toISOString();
    patch.ended_at = null;
  }
  const saved = await writeLive(patch);
  cache = { at: 0, value: null };
  return saved;
}

export async function stopPatreonLive({ by }) {
  const saved = await writeLive({ is_live: false, ended_at: new Date().toISOString(), updated_by: by || null });
  cache = { at: 0, value: null };
  return saved;
}
