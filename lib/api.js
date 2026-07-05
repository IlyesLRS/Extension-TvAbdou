// Couche d'acces aux API Twitch (Helix) et YouTube (Data API v3).
// Les cles sont lues depuis chrome.storage (configurees dans les Options).
import { CONFIG } from "../config.js";

// ---------- Gestion des cles ----------
export async function getKeys() {
  const d = await chrome.storage.local.get([
    "twitchClientId",
    "twitchClientSecret",
    "youtubeApiKey"
  ]);
  return {
    twitchClientId: d.twitchClientId || "",
    twitchClientSecret: d.twitchClientSecret || "",
    youtubeApiKey: d.youtubeApiKey || ""
  };
}

export async function isConfigured() {
  const k = await getKeys();
  return Boolean(k.twitchClientId && k.twitchClientSecret);
}

// ---------- Token Twitch (client credentials) ----------
async function getTwitchToken() {
  const k = await getKeys();
  if (!k.twitchClientId || !k.twitchClientSecret) {
    throw new Error("Cles Twitch manquantes. Ouvre les Options.");
  }
  const cache = await chrome.storage.local.get(["twitchToken", "twitchTokenExp"]);
  const now = Date.now();
  if (cache.twitchToken && cache.twitchTokenExp && cache.twitchTokenExp - now > 60000) {
    return cache.twitchToken;
  }
  const params = new URLSearchParams({
    client_id: k.twitchClientId,
    client_secret: k.twitchClientSecret,
    grant_type: "client_credentials"
  });
  const res = await fetch("https://id.twitch.tv/oauth2/token?" + params.toString(), {
    method: "POST"
  });
  if (!res.ok) throw new Error("Echec token Twitch (" + res.status + ")");
  const j = await res.json();
  await chrome.storage.local.set({
    twitchToken: j.access_token,
    twitchTokenExp: now + j.expires_in * 1000
  });
  return j.access_token;
}

async function twitchGet(path, params) {
  const k = await getKeys();
  const token = await getTwitchToken();
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  const res = await fetch("https://api.twitch.tv/helix/" + path + qs, {
    headers: {
      "Client-ID": k.twitchClientId,
      Authorization: "Bearer " + token
    }
  });
  if (res.status === 401) {
    // token invalide : on le vide et on retente une fois
    await chrome.storage.local.remove(["twitchToken", "twitchTokenExp"]);
    const t2 = await getTwitchToken();
    const res2 = await fetch("https://api.twitch.tv/helix/" + path + qs, {
      headers: { "Client-ID": k.twitchClientId, Authorization: "Bearer " + t2 }
    });
    if (!res2.ok) throw new Error("Twitch API " + res2.status);
    return res2.json();
  }
  if (!res.ok) throw new Error("Twitch API " + res.status);
  return res.json();
}

let _userIdCache = null;
async function getTwitchUserId() {
  if (_userIdCache) return _userIdCache;
  const j = await twitchGet("users", { login: CONFIG.twitchLogin });
  if (!j.data || !j.data.length) throw new Error("Chaine Twitch introuvable");
  _userIdCache = j.data[0].id;
  return _userIdCache;
}

// ---------- Statut du live ----------
export async function getStreamStatus() {
  const j = await twitchGet("streams", { user_login: CONFIG.twitchLogin });
  const s = j.data && j.data[0];
  if (!s) return { live: false };
  return {
    live: true,
    title: s.title,
    viewers: s.viewer_count,
    startedAt: s.started_at,
    game: s.game_name,
    thumbnail: s.thumbnail_url
      ? s.thumbnail_url.replace("{width}", "440").replace("{height}", "248")
      : null,
    login: CONFIG.twitchLogin
  };
}

// ---------- Derniere VOD ----------
export async function getLastVod() {
  const userId = await getTwitchUserId();
  const j = await twitchGet("videos", {
    user_id: userId,
    type: "archive",
    first: "1",
    sort: "time"
  });
  const v = j.data && j.data[0];
  if (!v) return null;
  return {
    title: v.title,
    url: v.url,
    date: v.created_at,
    duration: v.duration, // ex "3h25m40s"
    views: v.view_count,
    thumbnail: v.thumbnail_url
      ? v.thumbnail_url.replace("%{width}", "440").replace("%{height}", "248")
      : null
  };
}

// ---------- Planning (schedule Twitch) ----------
export async function getSchedule() {
  const userId = await getTwitchUserId();
  try {
    const j = await twitchGet("schedule", { broadcaster_id: userId, first: "10" });
    const segs = (j.data && j.data.segments) || [];
    return segs.map((s) => ({
      title: s.title || "Stream",
      start: s.start_time,
      end: s.end_time,
      category: s.category ? s.category.name : null,
      canceled: Boolean(s.canceled_until)
    }));
  } catch (e) {
    // 404 = pas de planning configure sur Twitch
    return [];
  }
}

// ---------- YouTube ----------
let _uploadsPlaylist = null;
async function getUploadsPlaylistId() {
  if (_uploadsPlaylist) return _uploadsPlaylist;
  const k = await getKeys();
  if (!k.youtubeApiKey) throw new Error("Cle YouTube manquante");
  const handle = CONFIG.youtubeHandle.replace(/^@/, "");
  const url =
    "https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=@" +
    encodeURIComponent(handle) +
    "&key=" +
    k.youtubeApiKey;
  const res = await fetch(url);
  if (!res.ok) throw new Error("YouTube API " + res.status);
  const j = await res.json();
  const item = j.items && j.items[0];
  if (!item) throw new Error("Chaine YouTube introuvable");
  _uploadsPlaylist = item.contentDetails.relatedPlaylists.uploads;
  return _uploadsPlaylist;
}

export async function getLatestVideos(max = 3) {
  const k = await getKeys();
  if (!k.youtubeApiKey) return [];
  const playlist = await getUploadsPlaylistId();
  const url =
    "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=" +
    max +
    "&playlistId=" +
    playlist +
    "&key=" +
    k.youtubeApiKey;
  const res = await fetch(url);
  if (!res.ok) throw new Error("YouTube API " + res.status);
  const j = await res.json();
  return (j.items || []).map((it) => {
    const sn = it.snippet;
    const th = sn.thumbnails || {};
    return {
      id: sn.resourceId.videoId,
      title: sn.title,
      date: sn.publishedAt,
      url: "https://www.youtube.com/watch?v=" + sn.resourceId.videoId,
      thumbnail: (th.medium || th.high || th.default || {}).url || null
    };
  });
}
