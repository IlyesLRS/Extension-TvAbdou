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

// Statut complet : { live, stream, vod }
export async function getStatus(bust) {
  return get("/api/status", bust);
}

// Pour le background : renvoie juste l'objet stream ou { live:false }
export async function getStreamStatus() {
  const d = await getStatus(true);
  return d.live && d.stream ? d.stream : { live: false };
}

export async function getLatestVideos(max = 3, bust) {
  const d = await get("/api/videos?max=" + max, bust);
  return d.videos || [];
}

export async function getPatreonPosts(bust) {
  return get("/api/patreon", bust); // { configured, posts }
}
