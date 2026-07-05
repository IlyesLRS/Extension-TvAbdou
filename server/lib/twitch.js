// Helper Twitch Helix cote serveur. Les cles viennent des variables d'env Vercel.
let cache = { token: null, exp: 0 };

async function getToken() {
  if (cache.token && cache.exp - Date.now() > 60000) return cache.token;
  const params = new URLSearchParams({
    client_id: process.env.TWITCH_CLIENT_ID,
    client_secret: process.env.TWITCH_CLIENT_SECRET,
    grant_type: "client_credentials"
  });
  const r = await fetch("https://id.twitch.tv/oauth2/token?" + params.toString(), {
    method: "POST"
  });
  if (!r.ok) throw new Error("Twitch token " + r.status);
  const j = await r.json();
  cache = { token: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return cache.token;
}

export async function helix(path, params) {
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
    throw new Error("Variables TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET manquantes sur Vercel");
  }
  const token = await getToken();
  const qs = params ? "?" + new URLSearchParams(params).toString() : "";
  const r = await fetch("https://api.twitch.tv/helix/" + path + qs, {
    headers: {
      "Client-ID": process.env.TWITCH_CLIENT_ID,
      Authorization: "Bearer " + token
    }
  });
  if (r.status === 401) {
    cache = { token: null, exp: 0 }; // token invalide -> on force le refresh
    const t2 = await getToken();
    const r2 = await fetch("https://api.twitch.tv/helix/" + path + qs, {
      headers: { "Client-ID": process.env.TWITCH_CLIENT_ID, Authorization: "Bearer " + t2 }
    });
    if (!r2.ok) throw new Error("Twitch " + path + " " + r2.status);
    return r2.json();
  }
  if (!r.ok) throw new Error("Twitch " + path + " " + r.status);
  return r.json();
}

let userIdCache = null;
export async function getUserId(login) {
  if (userIdCache) return userIdCache;
  const j = await helix("users", { login });
  userIdCache = j.data && j.data[0] && j.data[0].id;
  if (!userIdCache) throw new Error("Chaine Twitch introuvable: " + login);
  return userIdCache;
}
