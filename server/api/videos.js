// GET /api/videos?max=3  -> dernieres videos YouTube
const KEY = process.env.YOUTUBE_API_KEY;
const HANDLE = (process.env.YOUTUBE_HANDLE || "@dikabdou").replace(/^@/, "");
const CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || ""; // override fiable (UC...)

let uploadsCache = null;
async function uploadsPlaylistId() {
  if (uploadsCache) return uploadsCache;

  // 1) Si un ID de chaine (UC...) est fourni, la playlist "uploads" s'en deduit directement.
  if (CHANNEL_ID) {
    const r = await fetch(
      "https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=" +
        encodeURIComponent(CHANNEL_ID) +
        "&key=" +
        KEY
    );
    if (!r.ok) throw new Error("YouTube channels " + r.status);
    const j = await r.json();
    const item = j.items && j.items[0];
    uploadsCache =
      item && item.contentDetails && item.contentDetails.relatedPlaylists.uploads;
    if (!uploadsCache) throw new Error("Chaine YouTube introuvable (id): " + CHANNEL_ID);
    return uploadsCache;
  }

  // 2) Sinon on tente via le handle (@...).
  const r = await fetch(
    "https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=@" +
      encodeURIComponent(HANDLE) +
      "&key=" +
      KEY
  );
  if (!r.ok) throw new Error("YouTube channels " + r.status);
  const j = await r.json();
  const item = j.items && j.items[0];
  uploadsCache =
    item && item.contentDetails && item.contentDetails.relatedPlaylists.uploads;
  if (!uploadsCache) throw new Error("Chaine YouTube introuvable: @" + HANDLE);
  return uploadsCache;
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=300");
  try {
    if (!KEY) throw new Error("Variable YOUTUBE_API_KEY manquante sur Vercel");
    const max = Math.min(10, parseInt((req.query && req.query.max) || "3", 10) || 3);
    const pl = await uploadsPlaylistId();
    const r = await fetch(
      "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=" +
        max +
        "&playlistId=" +
        pl +
        "&key=" +
        KEY
    );
    if (!r.ok) throw new Error("YouTube items " + r.status);
    const j = await r.json();
    const videos = (j.items || []).map((it) => {
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
    return res.status(200).json({ videos });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
