// Couche d'acces : appelle uniquement le proxy Vercel (aucune cle cote extension).
import { CONFIG } from "../config.js";

function base() {
  return CONFIG.proxyBase.replace(/\/+$/, "");
}

export function isConfigured() {
  return Boolean(CONFIG.proxyBase) && !/REMPLACE|REPLACE/i.test(CONFIG.proxyBase);
}

async function get(path, bust) {
  let url = base() + path;
  if (bust) url += (path.includes("?") ? "&" : "?") + "_=" + Date.now();
  const r = await fetch(url, bust ? { cache: "no-store" } : undefined);
  if (!r.ok) {
    let msg = "Proxy " + r.status;
    try {
      const j = await r.json();
      if (j && j.error) msg = j.error;
    } catch (_) {}
    throw new Error(msg);
  }
  return r.json();
}

// Statut complet : { live, stream, vods: [...] }
export async function getStatus(bust) {
  return get("/api/status", bust);
}

// Normalise l'ancien format ({ vod }) et le nouveau ({ vods }).
export function vodsOf(status) {
  if (status && Array.isArray(status.vods)) return status.vods;
  return status && status.vod ? [status.vod] : [];
}

// Pour le background : renvoie juste l'objet stream ou { live:false }
export async function getStreamStatus() {
  const d = await getStatus(true);
  return d.live && d.stream ? d.stream : { live: false };
}

// Dernieres videos d'une chaine YouTube ("main" ou "second", cf. CONFIG.youtube).
export async function getLatestVideos(max = 3, bust, ch = "main") {
  const d = await get("/api/videos?max=" + max + "&ch=" + encodeURIComponent(ch), bust);
  return d.videos || [];
}

// Infos publiques des chaines YouTube (nom + photo de profil).
export async function getYoutubeChannels(bust) {
  const d = await get("/api/channels", bust);
  return d.channels || [];
}

export async function getPatreonPosts(bust) {
  return get("/api/patreon", bust); // { configured, posts }
}
