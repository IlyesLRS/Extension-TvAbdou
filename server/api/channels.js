// GET /api/channels -> infos publiques des chaines YouTube (nom + photo de profil)
import { CHANNELS, channelInfo } from "../lib/youtube.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
  try {
    const keys = Object.keys(CHANNELS);
    const infos = await Promise.all(
      keys.map((k) => channelInfo(k).catch(() => null))
    );
    const channels = infos.filter(Boolean).map((c) => ({
      key: c.key,
      handle: c.handle,
      title: c.title,
      avatar: c.avatar,
      url: c.url
    }));
    if (!channels.length) throw new Error("Aucune chaine YouTube resolue");
    return res.status(200).json({ channels });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
