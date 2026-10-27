// GET /api/config -> config publique de l'extension (liens, reseaux, chaines YouTube...).
// A modifier dans ../lib/site-config.js.
import { SITE_CONFIG } from "../lib/site-config.js";

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  return res.status(200).json(SITE_CONFIG);
}
