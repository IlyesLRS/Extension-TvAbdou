// Helper Patreon cote serveur : gere l'access token et son renouvellement
// automatique via le refresh token (les jetons Patreon expirent ~1 mois).
//
// Variables d'env :
//   PATREON_ACCESS_TOKEN   - Creator's Access Token (optionnel si les 3 suivantes sont la)
//   PATREON_CLIENT_ID      - \
//   PATREON_CLIENT_SECRET  -  } renouvellement automatique
//   PATREON_REFRESH_TOKEN  - /
const CLIENT_ID = process.env.PATREON_CLIENT_ID;
const CLIENT_SECRET = process.env.PATREON_CLIENT_SECRET;
const ENV_ACCESS = process.env.PATREON_ACCESS_TOKEN || null;
const ENV_REFRESH = process.env.PATREON_REFRESH_TOKEN || null;

const TOKEN_URL = "https://www.patreon.com/api/oauth2/token";

// Etat en memoire du lambda : on repart de l'env a chaque demarrage a froid.
// exp = 0 signifie "expiration inconnue" (cas du jeton fourni via l'env).
let session = { access: ENV_ACCESS, refresh: ENV_REFRESH, exp: 0 };
let refreshing = null; // promesse partagee : evite N renouvellements simultanes

function authError(msg) {
  const e = new Error(msg);
  e.status = 401;
  return e;
}

export function canRefresh() {
  return Boolean(CLIENT_ID && CLIENT_SECRET && (session.refresh || ENV_REFRESH));
}

// L'onglet Patreon n'a de sens que si on a de quoi s'authentifier.
export function isConfigured() {
  return Boolean(session.access || ENV_ACCESS || canRefresh());
}

async function doRefresh() {
  // Toujours le refresh token le plus recent connu ; repli sur celui de l'env.
  const rt = session.refresh || ENV_REFRESH;
  if (!CLIENT_ID || !CLIENT_SECRET || !rt) {
    throw authError("Renouvellement Patreon impossible : PATREON_CLIENT_ID / PATREON_CLIENT_SECRET / PATREON_REFRESH_TOKEN manquants");
  }
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: rt,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET
  });
  const r = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });
  if (!r.ok) throw authError("Patreon refresh " + r.status);

  const j = await r.json();
  if (!j.access_token) throw authError("Patreon refresh : reponse sans access_token");

  session = {
    access: j.access_token,
    // Patreon renvoie un nouveau refresh token : on le garde pour cette instance.
    refresh: j.refresh_token || rt,
    exp: Date.now() + (Number(j.expires_in) || 2592000) * 1000
  };
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

// GET authentifie : renouvelle le jeton avant expiration, et reessaie une fois sur 401.
export async function patreonGet(url) {
  const expiringSoon = session.exp > 0 && session.exp - Date.now() < 60000;
  if (!session.access || expiringSoon) await refreshTokens();

  let r = await fetch(url, { headers: { Authorization: "Bearer " + session.access } });

  // Jeton refuse (expire / revoque) : on renouvelle puis on rejoue la requete.
  if (r.status === 401 && canRefresh()) {
    await refreshTokens();
    r = await fetch(url, { headers: { Authorization: "Bearer " + session.access } });
  }

  if (!r.ok) {
    const e = new Error("Patreon API " + r.status);
    e.status = r.status;
    throw e;
  }
  return r.json();
}
