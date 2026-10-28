// GET /api/cron/patreon - lance une fois par jour par le cron Vercel (voir vercel.json).
// Renouvelle le jeton Patreon bien avant son expiration, verifie l'acces et alerte sur Discord
// si ca ne marche pas.
// Ouvert dans un navigateur, renvoie seulement l'etat, sans rien toucher (aucun jeton n'est renvoye).
// Le cron Vercel est reconnu a son en-tete Authorization (si CRON_SECRET est defini) ou, a defaut,
// a son user-agent "vercel-cron".
import { maintenance, tokenStatus } from "../../lib/patreon.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const secret = (process.env.CRON_SECRET || "").trim();
  const h = req.headers || {};
  const fromCron = secret ? h.authorization === "Bearer " + secret : /vercel-cron/i.test(h["user-agent"] || "");

  if (!fromCron) {
    return res.status(200).json({ mode: "lecture", ...(await tokenStatus()) });
  }
  const out = await maintenance();
  return res.status(out.ok ? 200 : 500).json({ mode: "maintenance", ...out });
}
