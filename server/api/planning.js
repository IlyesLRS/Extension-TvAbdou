// GET /api/planning -> { days: [{ iso, day, date, today, sessions: [{ image, time, pos }], rest }] }
// Les 7 prochains jours du planning de stream (aujourd'hui en premier). Voir ../lib/planning.js.
import { getPlanning } from "../lib/planning.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  try {
    const force = Boolean(req.query && req.query._); // bouton Actualiser
    const data = await getPlanning(force);
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json(data);
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ error: "Planning indisponible" });
  }
}
