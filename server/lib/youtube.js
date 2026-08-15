// Helper YouTube Data API v3 cote serveur (cle dans les variables d'env Vercel).
export const KEY = process.env.YOUTUBE_API_KEY;

// Chaines suivies. Chaque entree est surchargeable par variables d'environnement.
// L'ID (UC...) est prioritaire sur le handle quand il est fourni.
export const CHANNELS = {
  main: {
    key: "main",
    handle: (process.env.YOUTUBE_HANDLE || "@hdkabdou").replace(/^@/, ""),
    id: process.env.YOUTUBE_CHANNEL_ID || ""
  },
  second: {
    key: "second",
    handle: (process.env.YOUTUBE_HANDLE_2 || "@abdou_mp4").replace(/^@/, ""),
    id: process.env.YOUTUBE_CHANNEL_ID_2 || ""
  }
};

export function channelOf(key) {
  return CHANNELS[key] || CHANNELS.main;
}

async function api(path, params) {
  const qs = new URLSearchParams({ ...params, key: KEY }).toString();
  const r = await fetch("https://www.googleapis.com/youtube/v3/" + path + "?" + qs);
  if (!r.ok) {
    let msg = "YouTube " + path + " " + r.status;
    try {
      const j = await r.json();
      if (j && j.error && j.error.message) msg = "YouTube: " + j.error.message;
    } catch (_) {}
    throw new Error(msg);
  }
  return r.json();
}

// Cache par chaine : { uploads, title, avatar, url } (dure le temps de vie du lambda).
const cache = {};

export async function channelInfo(key) {
  if (cache[key]) return cache[key];
  if (!KEY) throw new Error("Variable YOUTUBE_API_KEY manquante sur Vercel");

  const ch = channelOf(key);
  const params = { part: "contentDetails,snippet" };
  if (ch.id) params.id = ch.id;
  else params.forHandle = "@" + ch.handle;

  const j = await api("channels", params);
  const item = j.items && j.items[0];
  if (!item) throw new Error("Chaine YouTube introuvable: " + (ch.id || "@" + ch.handle));

  const th = (item.snippet && item.snippet.thumbnails) || {};
  cache[key] = {
    key: ch.key,
    id: item.id,
    handle: "@" + ch.handle,
    title: (item.snippet && item.snippet.title) || "@" + ch.handle,
    avatar: (th.medium || th.high || th.default || {}).url || null,
    url: "https://www.youtube.com/@" + ch.handle,
    uploads:
      item.contentDetails && item.contentDetails.relatedPlaylists
        ? item.contentDetails.relatedPlaylists.uploads
        : null
  };
  if (!cache[key].uploads) throw new Error("Playlist uploads introuvable: @" + ch.handle);
  return cache[key];
}

export async function latestVideos(key, max) {
  const info = await channelInfo(key);
  const j = await api("playlistItems", {
    part: "snippet",
    maxResults: String(max),
    playlistId: info.uploads
  });
  return (j.items || []).map((it) => {
    const sn = it.snippet;
    const th = sn.thumbnails || {};
    return {
      id: sn.resourceId.videoId,
      title: sn.title,
      date: sn.publishedAt,
      url: "https://www.youtube.com/watch?v=" + sn.resourceId.videoId,
      thumbnail: (th.medium || th.high || th.default || {}).url || null,
      channel: info.key,
      channelTitle: info.title
    };
  });
}
