// GET /api/status  -> statut live + 3 derniers contenus (lives passes / temps forts) si hors ligne
import { helix, getUserId } from "../lib/twitch.js";

const LOGIN = process.env.TWITCH_LOGIN || "tvabdou";

// Types Twitch gardes : "archive" = rediffusion de live, "highlight" = temps fort.
// "upload" (videos televersees) est exclu ; les clips ne sont pas renvoyes par cet endpoint.
const KEPT = new Set(["archive", "highlight"]);

function mapVideo(v) {
  return {
    id: v.id,
    type: v.type, // archive | highlight
    title: v.title,
    url: v.url,
    date: v.created_at,
    duration: v.duration,
    views: v.view_count,
    thumbnail: v.thumbnail_url
      ? v.thumbnail_url.replace("%{width}", "440").replace("%{height}", "248")
      : null
  };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");
  try {
    const s = await helix("streams", { user_login: LOGIN });
    const stream = s.data && s.data[0];

    if (stream) {
      return res.status(200).json({
        live: true,
        stream: {
          live: true,
          title: stream.title,
          viewers: stream.viewer_count,
          startedAt: stream.started_at,
          game: stream.game_name,
          thumbnail: stream.thumbnail_url
            ? stream.thumbnail_url.replace("{width}", "440").replace("{height}", "248")
            : null,
          login: LOGIN
        },
        vods: [],
        vod: null
      });
    }

    // Hors ligne : 3 derniers lives passes / temps forts (les plus recents d'abord).
    const id = await getUserId(LOGIN);
    const v = await helix("videos", { user_id: id, type: "all", first: "40", sort: "time" });
    const vods = (v.data || [])
      .filter((x) => KEPT.has(x.type))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 3)
      .map(mapVideo);

    // "vod" reste renseigne pour compatibilite avec les anciennes versions de l'extension.
    return res.status(200).json({ live: false, stream: null, vods, vod: vods[0] || null });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
