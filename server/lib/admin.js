// Session de la page privee /live-patreon : cookie signe (HMAC), valable 12 h.
// Ouverte seulement apres une connexion Patreon reussie avec le compte proprietaire de la campagne.
// La cle de signature derive de PATREON_CLIENT_SECRET, qui ne quitte jamais le serveur.
import { createHmac, timingSafeEqual } from "node:crypto";

const NAME = "live_admin";
const TTL_MS = 12 * 3600000;

function key() {
  const s = (process.env.PATREON_CLIENT_SECRET || "").trim();
  if (!s) throw new Error("PATREON_CLIENT_SECRET manquant sur Vercel");
  return "tvabdou-live-admin:" + s;
}

function sign(payload) {
  return createHmac("sha256", key()).update(payload).digest("base64url");
}

export function adminCookie(who) {
  const exp = Date.now() + TTL_MS;
  const payload = exp + "." + Buffer.from(String(who || "TVABDOU").slice(0, 60)).toString("base64url");
  return `${NAME}=${payload}.${sign(payload)}; Path=/; Max-Age=${TTL_MS / 1000}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearAdminCookie() {
  return `${NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

// Renvoie { who } si la session est valide, sinon null.
export function readAdmin(req) {
  try {
    const m = new RegExp("(?:^|;\\s*)" + NAME + "=([^;]+)").exec((req.headers && req.headers.cookie) || "");
    if (!m) return null;
    const parts = m[1].split(".");
    if (parts.length !== 3) return null;
    const [exp, who, sig] = parts;
    const expected = Buffer.from(sign(exp + "." + who));
    const got = Buffer.from(sig);
    if (expected.length !== got.length || !timingSafeEqual(expected, got)) return null;
    if (!(Number(exp) > Date.now())) return null;
    return { who: Buffer.from(who, "base64url").toString("utf8") };
  } catch (_) {
    return null;
  }
}
