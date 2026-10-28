// Appels au serveur depuis l'interface (aucune cle API ici).
// En mode remote la base est le serveur lui-meme, en mode local c'est CONFIG.proxyBase.
let BASE = "";

export function setBase(b) {
  BASE = String(b || "").replace(/\/+$/, "");
}

async function get(path, bust) {
  let url = BASE + path;
  if (bust) url += (path.includes("?") ? "&" : "?") + "_=" + Date.now();
  const r = await fetch(url, bust ? { cache: "no-store" } : undefined);
  if (!r.ok) {
    let msg = "Serveur " + r.status;
    try {
      const j = await r.json();
      if (j && j.error) msg = j.error;
    } catch (_) {}
    throw new Error(msg);
  }
  return r.json();
}

// Statut complet : { live, stream, vods: [...] }
export function getStatus(bust) {
  return get("/api/status", bust);
}

// Normalise l'ancien format ({ vod }) et le nouveau ({ vods }).
export function vodsOf(status) {
  if (status && Array.isArray(status.vods)) return status.vods;
  return status && status.vod ? [status.vod] : [];
}

// Dernieres videos d'une chaine YouTube (cle de site-config.js).
export async function getLatestVideos(max = 3, bust, ch = "main") {
  const d = await get("/api/videos?max=" + max + "&ch=" + encodeURIComponent(ch), bust);
  return d.videos || [];
}

// Infos publiques des chaines YouTube (nom + photo de profil).
export async function getYoutubeChannels(bust) {
  const d = await get("/api/channels", bust);
  return d.channels || [];
}

export function getPatreonPosts(bust) {
  return get("/api/patreon", bust); // { configured, posts }
}

// Les 7 prochains jours du planning de stream (aujourd'hui en premier).
export async function getPlanning(bust) {
  const d = await get("/api/planning", bust);
  return (d && d.days) || [];
}
