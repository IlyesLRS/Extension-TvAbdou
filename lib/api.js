// Couche d'acces : appelle uniquement le proxy Vercel (aucune cle cote extension).
import { CONFIG } from "../config.js";

function base() {
  return CONFIG.proxyBase.replace(/\/+$/, "");
}

export function isConfigured() {
  return Boolean(CONFIG.proxyBase) && !/REMPLACE|REPLACE/i.test(CONFIG.proxyBase);
}

async function get(path) {
  const r = await fetch(base() + path);
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

// Statut complet : { live, stream, vod }
export async function getStatus() {
  return get("/api/status");
}

// Pour le background : renvoie juste l'objet stream ou { live:false }
export async function getStreamStatus() {
  const d = await getStatus();
  return d.live && d.stream ? d.stream : { live: false };
}

export async function getLatestVideos(max = 3) {
  const d = await get("/api/videos?max=" + max);
  return d.videos || [];
}
