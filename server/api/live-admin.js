// GET/POST /live-patreon (reecrit vers /api/live-admin par vercel.json)
// Page privee pour signaler un live Patreon a l'extension (badge LIVE, carte, notification).
// Acces : apres connexion Patreon avec le compte proprietaire de la campagne TVABDOU.
import { readAdmin, clearAdminCookie } from "../lib/admin.js";
import { readLiveRow, startPatreonLive, stopPatreonLive, patreonPageUrl, safePatreonUrl } from "../lib/live.js";
import { storeEnabled } from "../lib/store.js";
import { page, esc } from "../lib/page.js";

function html(res, status, opts) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Frame-Options", "DENY");
  return res.status(status).send(page({ title: "Live Patreon — TVABDOU", ...opts }));
}

function since(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const t = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
  const mins = Math.max(0, Math.round((Date.now() - d.getTime()) / 60000));
  const dur = mins < 60 ? mins + " min" : Math.floor(mins / 60) + " h " + String(mins % 60).padStart(2, "0");
  return "depuis " + t + " (" + dur + ")";
}

// Protection anti-falsification en plus du cookie SameSite=Lax : le formulaire doit venir de chez nous.
function sameOrigin(req) {
  const h = req.headers || {};
  const origin = h.origin || h.referer || "";
  if (!origin) return true;
  try {
    return new URL(origin).host === h.host;
  } catch (_) {
    return false;
  }
}

export default async function handler(req, res) {
  if (!storeEnabled) {
    return html(res, 500, { icon: "⚠️", heading: "Stockage non configuré", body: "<p>SUPABASE_URL / SUPABASE_SECRET_KEY manquants sur Vercel.</p>" });
  }

  const admin = readAdmin(req);
  if (!admin) {
    return html(res, 200, {
      icon: "🔒",
      heading: "Live Patreon",
      body:
        "<p>Cette page sert à prévenir l'extension TVABDOU quand un live commence ou se termine sur Patreon.</p>" +
        '<p class="muted">Connecte-toi avec le compte Patreon TVABDOU pour continuer.</p>',
      button: { href: "/connecter-patreon?mode=admin", label: "Se connecter avec Patreon" }
    });
  }

  if (req.method === "POST") {
    if (!sameOrigin(req)) return html(res, 403, { icon: "⚠️", heading: "Demande refusée", body: "<p>Origine inconnue.</p>" });
    const b = req.body || {};
    try {
      if (b.action === "logout") {
        res.setHeader("Set-Cookie", clearAdminCookie());
      } else if (b.action === "start") {
        if (b.url && !safePatreonUrl(b.url)) {
          return html(res, 400, {
            icon: "⚠️",
            heading: "Lien refusé",
            body: "<p>Le lien du live doit être une adresse patreon.com (ou laisse le champ vide).</p>",
            button: { href: "/live-patreon", label: "Retour" }
          });
        }
        await startPatreonLive({ title: b.title, url: b.url, by: admin.who });
      } else if (b.action === "stop") {
        await stopPatreonLive({ by: admin.who });
      }
    } catch (e) {
      return html(res, 500, { icon: "⚠️", heading: "Échec", body: `<p>${esc(e.message)}</p>`, button: { href: "/live-patreon", label: "Retour" } });
    }
    res.statusCode = 303;
    res.setHeader("Location", "/live-patreon");
    res.setHeader("Cache-Control", "no-store");
    return res.end();
  }

  let row;
  try {
    row = await readLiveRow();
  } catch (e) {
    return html(res, 500, { icon: "⚠️", heading: "Lecture impossible", body: `<p>${esc(e.message)}</p>` });
  }

  const on = Boolean(row.is_live);
  const state = on
    ? `<div class="state"><span class="dot on"></span>En live sur Patreon ${esc(since(row.started_at))}</div>` +
      (row.title ? `<p class="hint">Titre affiché : ${esc(row.title)}</p>` : "")
    : `<div class="state"><span class="dot"></span>Hors ligne sur Patreon</div>`;

  const form = on
    ? `<form method="post">
         <input type="hidden" name="action" value="stop">
         <button class="stop" type="submit">⏹ Fin du live</button>
       </form>
       <form method="post">
         <input type="hidden" name="action" value="start">
         <label for="t">Corriger le titre (facultatif)</label>
         <input id="t" name="title" type="text" maxlength="140" value="${esc(row.title || "")}">
         <label for="u">Corriger le lien du live (facultatif)</label>
         <input id="u" name="url" type="url" value="${esc(row.url || "")}" placeholder="${esc(patreonPageUrl())}">
         <button type="submit">Mettre à jour</button>
       </form>`
    : `<form method="post">
         <input type="hidden" name="action" value="start">
         <label for="t">Titre du live (facultatif)</label>
         <input id="t" name="title" type="text" maxlength="140" placeholder="Ex. : Réaction en direct">
         <label for="u">Lien du live (facultatif)</label>
         <input id="u" name="url" type="url" placeholder="${esc(patreonPageUrl())}">
         <div class="hint">Sans lien, l'extension envoie vers la page Patreon de TVABDOU.</div>
         <button type="submit">🔴 Je lance le live sur Patreon</button>
       </form>`;

  return html(res, 200, {
    icon: on ? "🔴" : "📺",
    heading: "Live Patreon",
    body:
      state +
      form +
      `<div class="foot">Connecté : ${esc(admin.who)} · le live se termine tout seul après 12 h.
         <form method="post" style="display:inline;margin:0"><input type="hidden" name="action" value="logout">
         <a href="#" onclick="this.closest('form').submit();return false;">Se déconnecter</a></form></div>`
  });
}
