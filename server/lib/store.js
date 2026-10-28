// Stockage durable du jeton Patreon dans Supabase (projet reseaux-tvabdou).
// Table public.ext_patreon_token (ligne unique id=1) + fonction public.ext_patreon_lock.
// Acces via l'API REST de Supabase avec la cle secrete (jamais exposee a l'extension).
//
// Variables d'env :
//   SUPABASE_URL          - ex. https://xxxx.supabase.co
//   SUPABASE_SECRET_KEY   - cle secrete "sb_secret_..." (ou l'ancienne cle service_role)
// .trim() : un espace ou un retour a la ligne colle avec la valeur suffit a tout casser.
const BASE = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const KEY = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
const TABLE = "ext_patreon_token";

export const storeEnabled = Boolean(BASE && KEY);
// SUPABASE_URL est renseignee mais pas la cle : on veut le stockage, il est mal configure.
export const storeMisconfigured = Boolean(BASE) && !KEY;

// Nature de la cle (jamais sa valeur), pour la page d'etat.
export const keyKind = !KEY
  ? "absente ou vide"
  : KEY.startsWith("sb_secret_")
    ? "cle secrete (sb_secret_)"
    : KEY.startsWith("sb_publishable_")
      ? "ERREUR : cle publique (sb_publishable_) au lieu de la cle secrete"
      : KEY.split(".").length === 3
        ? "ancienne cle (JWT)"
        : "format inconnu";

function headers(extra) {
  const h = { apikey: KEY, "Content-Type": "application/json", ...extra };
  // Les nouvelles cles "sb_..." passent par le seul en-tete apikey ;
  // l'ancienne cle service_role (JWT) doit aussi etre envoyee en Bearer.
  if (!KEY.startsWith("sb_")) h.Authorization = "Bearer " + KEY;
  return h;
}

async function rest(method, path, body, extra) {
  const r = await fetch(BASE + "/rest/v1/" + path, {
    method,
    headers: headers(extra),
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(8000)
  });
  if (!r.ok) {
    let msg = "Supabase " + method + " " + path.split("?")[0] + " " + r.status;
    try {
      const j = await r.json();
      if (j && j.message) msg += " : " + j.message;
    } catch (_) {}
    throw new Error(msg);
  }
  if (r.status === 204) return null;
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
}

// Lit la ligne du jeton (la cree si elle a disparu).
export async function readRow() {
  const rows = await rest("GET", TABLE + "?id=eq.1&select=*");
  if (rows && rows[0]) return rows[0];
  const created = await rest("POST", TABLE, { id: 1 }, {
    Prefer: "resolution=merge-duplicates,return=representation"
  });
  return (created && created[0]) || { id: 1, version: 0 };
}

// Met a jour la ligne. Avec ifVersion, n'ecrit que si personne d'autre n'a ecrit entre-temps
// (renvoie null dans ce cas).
export async function updateRow(patch, ifVersion) {
  let q = TABLE + "?id=eq.1";
  if (typeof ifVersion === "number") q += "&version=eq." + ifVersion;
  const rows = await rest("PATCH", q, { ...patch, updated_at: new Date().toISOString() }, {
    Prefer: "return=representation"
  });
  return (rows && rows[0]) || null;
}

// Prend le verrou de renouvellement pour `seconds` secondes.
// Renvoie la ligne a jour si le verrou est obtenu, null si une autre instance le tient deja.
export async function tryLock(seconds = 30) {
  const rows = await rest("POST", "rpc/ext_patreon_lock", { lease_seconds: seconds });
  return (Array.isArray(rows) && rows[0]) || null;
}
