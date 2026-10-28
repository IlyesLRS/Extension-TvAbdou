// GET /api/status -> lives en cours (Twitch + Patreon) + 3 derniers contenus Twitch si hors ligne
//
// Format :
//   lives  : [{ platform: "twitch" | "patreon", title, url, startedAt, ... }]  (extension >= 1.2.0)
//   live / stream : live Twitch uniquement, garde pour les anciennes versions de l'extension
//   vods / vod    : derniers lives passes / temps forts Twitch quand Twitch est hors ligne
import { helix, getUserId } from "../lib/twitch.js";
import { SITE_CONFIG } from "../lib/site-config.js";
import { getPatreonLive } from "../lib/live.js";

const LOGIN = process.env.TWITCH_LOGIN || SITE_CONFIG.twitchLogin || "tvabdou";

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
    const [s, patreon] = await Promise.all([helix("streams", { user_login: LOGIN }), getPatreonLive()]);
    const stream = s.data && s.data[0];
    const lives = [];

    let twitch = null;
    if (stream) {
      twitch = {
        live: true,
        title: stream.title,
        viewers: stream.viewer_count,
        startedAt: stream.started_at,
        game: stream.game_name,
        thumbnail: stream.thumbnail_url
          ? stream.thumbnail_url.replace("{width}", "440").replace("{height}", "248")
          : null,
        login: LOGIN
      };
      lives.push({ platform: "twitch", url: "https://twitch.tv/" + LOGIN, ...twitch });
    }
    if (patreon) lives.push(patreon);

    let vods = [];
    if (!stream) {
      // Twitch hors ligne : 3 derniers lives passes / temps forts (les plus recents d'abord).
      const id = await getUserId(LOGIN);
      const v = await helix("videos", { user_id: id, type: "all", first: "40", sort: "time" });
      vods = (v.data || [])
        .filter((x) => KEPT.has(x.type))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 3)
        .map(mapVideo);
    }

    return res.status(200).json({
      lives,
      live: Boolean(stream),
      stream: twitch,
      vods,
      vod: vods[0] || null
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
