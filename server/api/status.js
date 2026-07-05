// GET /api/status  -> statut live + derniere VOD si hors ligne
import { helix, getUserId } from "../lib/twitch.js";

const LOGIN = process.env.TWITCH_LOGIN || "tvabdou";

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
        vod: null
      });
    }

    // Hors ligne : derniere VOD
    const id = await getUserId(LOGIN);
    const v = await helix("videos", { user_id: id, type: "archive", first: "1", sort: "time" });
    const vv = v.data && v.data[0];
    const vod = vv
      ? {
          title: vv.title,
          url: vv.url,
          date: vv.created_at,
          duration: vv.duration,
          views: vv.view_count,
          thumbnail: vv.thumbnail_url
            ? vv.thumbnail_url.replace("%{width}", "440").replace("%{height}", "248")
            : null
        }
      : null;

    return res.status(200).json({ live: false, stream: null, vod });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
