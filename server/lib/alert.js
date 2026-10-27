// Alerte Discord (webhook) quand l'acces Patreon casse, et quand il revient.
//
// Variable d'env :
//   DISCORD_WEBHOOK_URL - URL du webhook d'un salon prive (Parametres du salon > Integrations > Webhooks)
const WEBHOOK = process.env.DISCORD_WEBHOOK_URL || "";

export const alertEnabled = Boolean(WEBHOOK);

export async function sendAlert(content) {
  if (!WEBHOOK) return false;
  try {
    const r = await fetch(WEBHOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Extension TvAbdou",
        content: String(content).slice(0, 1900),
        allowed_mentions: { parse: [] }
      }),
      signal: AbortSignal.timeout(8000)
    });
    return r.ok;
  } catch (e) {
    console.warn("alerte Discord:", e.message);
    return false;
  }
}
