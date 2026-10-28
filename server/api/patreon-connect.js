// GET /connecter-patreon (reecrit vers /api/patreon-connect par vercel.json)
// Envoie le createur sur Patreon pour autoriser l'extension. Retour sur /api/patreon-callback.
import { randomBytes } from "node:crypto";
import { authorizeUrl } from "../lib/patreon.js";
import { page, esc } from "../lib/page.js";

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    const state = randomBytes(24).toString("hex");
    // Jeton anti-falsification : le retour de Patreon doit rapporter la meme valeur.
    res.setHeader(
      "Set-Cookie",
      `patreon_state=${state}; Path=/api; Max-Age=600; HttpOnly; Secure; SameSite=Lax`
    );
    res.statusCode = 302;
    res.setHeader("Location", authorizeUrl(state));
    return res.end();
  } catch (e) {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.status(500).send(
      page({
        title: "Connexion Patreon",
        icon: "⚠️",
        heading: "Connexion impossible pour l'instant",
        body: `<p>${esc(e.message)}</p>`
      })
    );
  }
}
