// GET /api/cron/patreon - lance une fois par jour par le cron Vercel (voir vercel.json).
// Renouvelle le jeton Patreon bien avant son expiration, verifie l'acces et alerte sur Discord
// si ca ne marche pas.
// Sans l'en-tete du cron (quand CRON_SECRET est defini), renvoie seulement l'etat, sans rien toucher :
// pratique pour verifier depuis un navigateur. Aucun jeton n'est jamais renvoye.
import { maintenance, tokenStatus } from "../../lib/patreon.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const secret = process.env.CRON_SECRET;
  const fromCron = !secret || (req.headers && req.headers.authorization) === "Bearer " + secret;

  if (!fromCron) {
    return res.status(200).json({ mode: "lecture", ...(await tokenStatus()) });
  }
  const out = await maintenance();
  return res.status(out.ok ? 200 : 500).json({ mode: "maintenance", ...out });
}
