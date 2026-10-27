// GET /api/videos?max=3&ch=main|second|all  -> dernieres videos YouTube
import { CHANNELS, DEFAULT_CHANNEL, latestVideos } from "../lib/youtube.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=300");
  try {
    const q = req.query || {};
    const max = Math.min(10, parseInt(q.max || "3", 10) || 3);
    const ch = String(q.ch || DEFAULT_CHANNEL);

    // ch=all : toutes les chaines fusionnees, triees par date decroissante.
    if (ch === "all") {
      const lists = await Promise.all(Object.keys(CHANNELS).map((k) => latestVideos(k, max)));
      const videos = lists
        .flat()
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, max);
      return res.status(200).json({ videos });
    }

    const videos = await latestVideos(CHANNELS[ch] ? ch : DEFAULT_CHANNEL, max);
    return res.status(200).json({ videos });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
