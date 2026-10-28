// Helper Patreon cote serveur : jeton d'acces + renouvellement automatique.
//
// Pourquoi un stockage durable : chez Patreon, le refresh token est A USAGE UNIQUE.
// A chaque renouvellement, Patreon en donne un nouveau et l'ancien ne marche plus.
// Garde seulement en memoire, il etait perdu au redemarrage du serveur et le proxy
// retombait sur l'ancien jeton de Vercel, deja consomme -> panne tous les mois.
// Le jeton courant vit donc dans Supabase (lib/store.js) ; sans Supabase configure,
// on retombe sur l'ancien fonctionnement (memoire seule).
//
// Variables d'env :
//   PATREON_CLIENT_ID / PATREON_CLIENT_SECRET - obligatoires pour renouveler
//   PATREON_ACCESS_TOKEN / PATREON_REFRESH_TOKEN - jetons de depart. S'ils changent dans
//     Vercel (jetons neufs colles a la main), ils remplacent automatiquement ceux du stockage.
import { createHash } from "node:crypto";
import { storeEnabled, storeMisconfigured, keyKind, readRow, updateRow, tryLock } from "./store.js";
import { alertEnabled, sendAlert } from "./alert.js";

// .trim() : un espace ou un retour a la ligne colle avec un jeton le rend invalide.
const env = (k) => (process.env[k] || "").trim();
const CLIENT_ID = env("PATREON_CLIENT_ID");
const CLIENT_SECRET = env("PATREON_CLIENT_SECRET");
const ENV_ACCESS = env("PATREON_ACCESS_TOKEN") || null;
const ENV_REFRESH = env("PATREON_REFRESH_TOKEN") || null;

const TOKEN_URL = "https://www.patreon.com/api/oauth2/token";
export const API = "https://www.patreon.com/api/oauth2/v2";

const DAY = 86400000;
const SOON = 2 * DAY; // pendant une requete : on renouvelle si le jeton expire dans moins de 2 jours
const CRON_MARGIN = 10 * DAY; // cron quotidien : on renouvelle des qu'il reste moins de 10 jours
const ALERT_EVERY = 12 * 3600000; // une alerte Discord au plus toutes les 12 h
const FIX_HELP =
  "Pour réparer : sur https://www.patreon.com/portal/registration/register-clients (compte créateur), " +
  "copie le Creator's Access Token et le Creator's Refresh Token, colle-les dans PATREON_ACCESS_TOKEN et " +
  "PATREON_REFRESH_TOKEN sur Vercel, puis redéploie. Le serveur les reprend tout seul.";

// Empreinte des jetons poses dans Vercel : si elle change, des jetons neufs ont ete colles.
const SEED =
  ENV_ACCESS || ENV_REFRESH
    ? createHash("sha256").update((ENV_ACCESS || "") + "|" + (ENV_REFRESH || "")).digest("hex").slice(0, 16)
    : null;

let session = null; // { access, refresh, exp (ms, 0 = inconnue), version, alertedAt }
let loading = null;
let refreshing = null;
let memAlertedAt = 0;
let lastFailure = null; // { message, at } : derniere erreur vue par cette instance (page d'etat)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const nowIso = () => new Date().toISOString();

function authError(msg) {
  const e = new Error(msg);
  e.status = 401;
  return e;
}

function fromRow(row) {
  return {
    access: row.access_token || null,
    refresh: row.refresh_token || null,
    exp: row.expires_at ? Date.parse(row.expires_at) : 0,
    version: Number(row.version) || 0,
    alertedAt: row.alerted_at ? Date.parse(row.alerted_at) : 0
  };
}

export function canRefresh() {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

// ---------- Chargement (stockage, ou env en repli) ----------
async function load(force) {
  if (session && !force) return session;
  if (!loading) {
    loading = (async () => {
      if (!storeEnabled) {
        session = session || { access: ENV_ACCESS, refresh: ENV_REFRESH, exp: 0, version: 0, alertedAt: 0 };
        return session;
      }
      let row = await readRow();
      if (SEED && row.seed_hash !== SEED) {
        // Jetons neufs colles dans Vercel : ils remplacent ceux du stockage.
        const v = Number(row.version) || 0;
        const seeded = await updateRow(
          {
            access_token: ENV_ACCESS,
            refresh_token: ENV_REFRESH,
            expires_at: null,
            seed_hash: SEED,
            version: v + 1,
            last_error: null,
            last_error_at: null
          },
          v
        );
        row = seeded || (await readRow());
      }
      session = fromRow(row);
      return session;
    })().finally(() => {
      loading = null;
    });
  }
  return loading;
}

export async function isConfigured() {
  const s = await load();
  return Boolean(s.access || (s.refresh && canRefresh()));
}

// ---------- Renouvellement ----------
async function callTokenEndpoint(rt) {
  if (!canRefresh()) {
    throw authError("Renouvellement impossible : PATREON_CLIENT_ID / PATREON_CLIENT_SECRET manquants sur Vercel");
  }
  if (!rt) throw authError("Aucun refresh token Patreon enregistré");
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: rt,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET
    }),
    signal: AbortSignal.timeout(10000)
  });
  if (!r.ok) {
    let detail = "";
    try {
      const j = await r.json();
      if (j && j.error) detail = " (" + j.error + ")";
    } catch (_) {}
    const e = authError("Patreon a refusé le renouvellement : " + r.status + detail);
    if (r.status >= 500) e.status = 502; // panne passagere de Patreon, pas un probleme de jeton
    throw e;
  }
  const j = await r.json();
  if (!j.access_token) throw authError("Patreon : réponse de renouvellement sans access_token");
  return {
    access: j.access_token,
    refresh: j.refresh_token || rt,
    exp: Date.now() + (Number(j.expires_in) || 31 * 86400) * 1000
  };
}

async function saveTokens(row, t) {
  const patch = {
    access_token: t.access,
    refresh_token: t.refresh,
    expires_at: new Date(t.exp).toISOString(),
    version: (Number(row.version) || 0) + 1,
    lock_until: null,
    last_error: null,
    last_error_at: null,
    alerted_at: null
  };
  // Le refresh token vient d'etre consomme : l'enregistrement du nouveau est vital, on insiste.
  let lastErr;
  for (let i = 0; i < 4; i++) {
    try {
      const saved = await updateRow(patch);
      if (saved) return saved;
    } catch (e) {
      lastErr = e;
    }
    await sleep(400 * (i + 1));
  }
  throw new Error("Jeton Patreon renouvelé mais pas enregistré dans Supabase" + (lastErr ? " : " + lastErr.message : ""));
}

async function doRefresh() {
  if (storeMisconfigured) {
    // Sans stockage, le nouveau jeton serait perdu au prochain redemarrage et celui de Vercel
    // serait deja consomme : on ne grille pas le jeton tant que Supabase n'est pas branche.
    throw authError("Stockage Supabase mal configuré (SUPABASE_SECRET_KEY " + keyKind + ") : renouvellement bloqué pour ne pas griller le jeton");
  }
  if (!storeEnabled) {
    const s = await load();
    const t = await callTokenEndpoint(s.refresh);
    session = { ...s, ...t };
    return session.access;
  }

  const known = session ? session.version : -1;
  let row = await tryLock(30);
  if (!row) {
    // Une autre instance renouvelle deja : on attend son resultat au lieu de griller le jeton.
    for (let i = 0; i < 8 && !row; i++) {
      await sleep(1000);
      const r = await readRow();
      if (Number(r.version) > known && r.access_token) {
        session = fromRow(r);
        return session.access;
      }
      if (!r.lock_until || Date.parse(r.lock_until) < Date.now()) row = await tryLock(30);
    }
    if (!row) throw new Error("Renouvellement Patreon déjà en cours ailleurs, réessaie dans un instant");
  }

  // Verrou obtenu. Si quelqu'un a renouvele entre-temps avec un jeton encore bon, on le reprend.
  const rowExp = row.expires_at ? Date.parse(row.expires_at) : 0;
  if (known >= 0 && Number(row.version) !== known && row.access_token && rowExp - Date.now() > SOON) {
    await updateRow({ lock_until: null }).catch(() => {});
    session = fromRow(row);
    return session.access;
  }

  let t;
  try {
    t = await callTokenEndpoint(row.refresh_token);
  } catch (e) {
    await updateRow({ lock_until: null, last_error: e.message, last_error_at: nowIso() }).catch(() => {});
    throw e;
  }

  try {
    const saved = await saveTokens(row, t);
    const wasAlerted = Boolean(row.alerted_at);
    session = fromRow(saved);
    if (wasAlerted) await sendAlert("✅ **Patreon : accès rétabli** pour l'extension TvAbdou.");
  } catch (e) {
    // Au pire on garde le nouveau jeton en memoire et on previent tout de suite.
    session = { access: t.access, refresh: t.refresh, exp: t.exp, version: Number(row.version) || 0, alertedAt: 0 };
    await sendAlert("⚠️ **Patreon** : " + e.message + ". Vérifie SUPABASE_URL / SUPABASE_SECRET_KEY sur Vercel.");
  }
  return session.access;
}

function refreshTokens() {
  if (!refreshing) {
    refreshing = doRefresh().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

// ---------- Alertes ----------
async function reportFailure(err) {
  lastFailure = { message: err.message, at: nowIso() };
  if (!alertEnabled) return;
  try {
    if (storeEnabled) {
      const row = await readRow();
      const last = row.alerted_at ? Date.parse(row.alerted_at) : 0;
      if (Date.now() - last < ALERT_EVERY) return;
      await updateRow({ alerted_at: nowIso() });
      if (session) session.alertedAt = Date.now();
    } else {
      if (Date.now() - memAlertedAt < ALERT_EVERY) return;
      memAlertedAt = Date.now();
    }
  } catch (_) {
    // Stockage injoignable : on alerte quand meme (le cron ne tourne qu'une fois par jour).
  }
  const until =
    session && session.exp && session.exp > Date.now()
      ? "\nLe jeton actuel marche encore jusqu'au " + new Date(session.exp).toLocaleDateString("fr-FR") + "."
      : "\nL'onglet Patreon de l'extension ne fonctionne plus.";
  await sendAlert("⚠️ **Patreon : problème d'accès pour l'extension TvAbdou.**\nErreur : " + err.message + until + "\n" + FIX_HELP);
}

async function markRecovered() {
  if (!session || !session.alertedAt) return;
  session.alertedAt = 0;
  memAlertedAt = 0;
  if (storeEnabled) await updateRow({ alerted_at: null }).catch(() => {});
  await sendAlert("✅ **Patreon : accès rétabli** pour l'extension TvAbdou.");
}

const isAuth = (e) => e && (e.status === 401 || e.status === 403);

// ---------- Requete authentifiee ----------
function call(url) {
  return fetch(url, {
    headers: { Authorization: "Bearer " + (session && session.access) },
    signal: AbortSignal.timeout(10000)
  });
}

// GET authentifie : renouvelle avant expiration, et sur 401 relit le stockage puis renouvelle.
export async function patreonGet(url) {
  const s = await load();
  if (!s.access || (s.exp && s.exp - Date.now() < SOON)) {
    try {
      await refreshTokens();
    } catch (e) {
      const stillValid = session && session.access && (!session.exp || session.exp > Date.now());
      if (!stillValid) {
        if (isAuth(e)) await reportFailure(e);
        throw e;
      }
      // Renouvellement rate mais le jeton actuel marche encore : on continue avec.
      if (isAuth(e)) await reportFailure(e);
    }
  }

  let r = await call(url);
  if (r.status === 401) {
    // Une autre instance a peut-etre deja renouvele : on relit d'abord le stockage.
    const before = session.version;
    await load(true);
    if (!storeEnabled || session.version === before) {
      try {
        await refreshTokens();
      } catch (e) {
        if (isAuth(e)) await reportFailure(e);
        throw e;
      }
    }
    r = await call(url);
  }

  if (!r.ok) {
    const e = new Error("Patreon API " + r.status);
    e.status = r.status;
    if (isAuth(e)) await reportFailure(e);
    throw e;
  }
  if (session.alertedAt) await markRecovered();
  return r.json();
}

// ---------- Cron quotidien ----------
// Renouvelle bien avant l'expiration, verifie l'acces, alerte si ca ne marche pas.
export async function maintenance() {
  const out = { store: storeEnabled, alerts: alertEnabled, refreshed: false };
  try {
    const s = await load(true);
    if (!s.access && !s.refresh) throw authError("Aucun jeton Patreon configuré");
    if (s.refresh && canRefresh() && (!s.exp || s.exp - Date.now() < CRON_MARGIN)) {
      await refreshTokens();
      out.refreshed = true;
    }
    await patreonGet(API + "/campaigns");
    out.ok = true;
  } catch (e) {
    out.ok = false;
    out.error = e.message;
    await reportFailure(e);
  }
  out.expiresAt = session && session.exp ? new Date(session.exp).toISOString() : null;
  return out;
}

// Verification sans effet de bord : essaie chaque jeton comme jeton d'acces sur l'API Patreon
// (rien n'est consomme). Sert a reperer un jeton invalide ou deux jetons inverses.
let lastCheck = 0;
async function bearerWorks(token) {
  if (!token) return null;
  try {
    const r = await fetch(API + "/campaigns", {
      headers: { Authorization: "Bearer " + token },
      signal: AbortSignal.timeout(8000)
    });
    return r.status === 200 ? true : r.status === 401 || r.status === 403 ? false : "HTTP " + r.status;
  } catch (e) {
    return "erreur reseau";
  }
}

export async function checkTokens() {
  if (Date.now() - lastCheck < 30000) return { check: "deja fait il y a moins de 30 s" };
  lastCheck = Date.now();
  let access = ENV_ACCESS;
  let refresh = ENV_REFRESH;
  if (storeEnabled) {
    try {
      const row = await readRow();
      access = row.access_token || access;
      refresh = row.refresh_token || refresh;
    } catch (_) {}
  }
  const accessOk = await bearerWorks(access);
  const refreshUsedAsAccess = await bearerWorks(refresh);
  let verdict;
  if (accessOk === true) verdict = "jeton d'acces valide";
  else if (refreshUsedAsAccess === true) verdict = "JETONS INVERSES : la valeur du Refresh Token est un jeton d'acces";
  else verdict = "jeton d'acces refuse par Patreon (et le refresh token n'en est pas un)";
  return { accessTokenWorks: accessOk, refreshTokenWorksAsAccess: refreshUsedAsAccess, verdict };
}

// Etat lisible sans secret (aucun jeton renvoye) : uniquement des oui/non, dates et messages d'erreur.
export async function tokenStatus() {
  const out = {
    store: storeEnabled,
    storeKey: keyKind,
    alerts: alertEnabled,
    canRefresh: canRefresh(),
    vercelHasAccessToken: Boolean(ENV_ACCESS),
    vercelHasRefreshToken: Boolean(ENV_REFRESH),
    lastFailureHere: lastFailure
  };
  try {
    if (storeEnabled) {
      const row = await readRow();
      out.hasToken = Boolean(row.access_token || row.refresh_token);
      out.expiresAt = row.expires_at || null;
      out.lastError = row.last_error || null;
      out.lastErrorAt = row.last_error_at || null;
      out.updatedAt = row.updated_at || null;
    } else {
      out.hasToken = Boolean(ENV_ACCESS || ENV_REFRESH);
    }
  } catch (e) {
    out.error = e.message;
  }
  return out;
}
