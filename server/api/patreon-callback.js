// GET /api/patreon-callback : retour de Patreon apres l'autorisation.
// Cette adresse exacte doit figurer dans les « Redirect URIs » du client sur le portail Patreon.
import { connectWithCode } from "../lib/patreon.js";
import { SITE_CONFIG } from "../lib/site-config.js";
import { page, esc } from "../lib/page.js";

// Nom de la campagne attendue : celui du lien Patreon de site-config (patreon.com/c/TVABDOU),
// surchargeable par PATREON_CAMPAIGN_VANITY.
function expectedVanity() {
  if (process.env.PATREON_CAMPAIGN_VANITY) return process.env.PATREON_CAMPAIGN_VANITY.trim();
  const s = (SITE_CONFIG.socials || []).find((x) => x.icon === "patreon");
  try {
    return new URL(s.url).pathname.split("/").filter(Boolean).pop() || "";
  } catch (_) {
    return "";
  }
}

function cookie(req, name) {
  const m = new RegExp("(?:^|;\\s*)" + name + "=([^;]+)").exec((req.headers && req.headers.cookie) || "");
  return m ? m[1] : null;
}

function send(res, status, opts) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Set-Cookie", "patreon_state=; Path=/api; Max-Age=0; HttpOnly; Secure; SameSite=Lax");
  return res.status(status).send(page({ title: "Connexion Patreon", ...opts }));
}

const RETRY = { href: "/connecter-patreon", label: "Recommencer" };

export default async function handler(req, res) {
  const q = req.query || {};
  if (q.error) {
    return send(res, 400, {
      icon: "✋",
      heading: "Connexion annulée",
      body: `<p>Patreon indique : ${esc(q.error_description || q.error)}.</p>`,
      button: RETRY
    });
  }
  const expected = cookie(req, "patreon_state");
  if (!q.code || !q.state || !expected || q.state !== expected) {
    return send(res, 400, {
      icon: "⚠️",
      heading: "Lien expiré ou invalide",
      body: "<p>Repars du lien de connexion (il reste valable 10 minutes).</p>",
      button: RETRY
    });
  }
  try {
    const r = await connectWithCode(q.code, expectedVanity());
    return send(res, 200, {
      icon: "✅",
      heading: "Patreon est connecté",
      body:
        `<p>Campagne : <b>${esc(r.campaign)}</b>.</p>` +
        "<p>Les publications réapparaissent dans l'extension d'ici quelques minutes. " +
        "Le serveur renouvellera l'accès tout seul.</p>" +
        '<p class="muted">Si un jour l\'onglet Patreon recasse, il suffira de rouvrir ce lien de connexion.</p>'
    });
  } catch (e) {
    return send(res, 500, {
      icon: "⚠️",
      heading: "La connexion n'a pas abouti",
      body: `<p>${esc(e.message)}</p>`,
      button: RETRY
    });
  }
}
