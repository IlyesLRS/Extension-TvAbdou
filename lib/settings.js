// Config effective de l'extension = config embarquee (config.js, copie de secours)
// + config distante servie par le proxy (/api/config, modifiable sans nouvelle version).
// La copie distante est gardee dans chrome.storage et rafraichie toutes les 15 minutes.
import { CONFIG as DEFAULTS } from "../config.js";
import { getRemoteConfig } from "./api.js";

const STORE_KEY = "remoteConfig";
const MAX_AGE = 15 * 60 * 1000;

// Icones embarquees dans popup.js (une icone inconnue devient "link").
const ICONS = new Set(["twitch", "youtube", "patreon", "discord", "instagram", "tiktok", "x", "kick", "threads", "bluesky", "link"]);
// Domaines autorises en iframe : doit suivre "frame-src" du manifest.
const FRAME_HOSTS = new Set(["planning-live.vercel.app"]);

function httpsUrl(u) {
  try {
    const x = new URL(String(u));
    return x.protocol === "https:" ? x.href : null;
  } catch (_) {
    return null;
  }
}

function text(v, max = 80) {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;
}

const KEY_RE = /^[a-z0-9_-]{1,30}$/i;

// Ne garde que des valeurs sures : URLs https, icones connues, bornes raisonnables.
export function sanitize(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;

  const login = text(raw.twitchLogin, 25);
  if (login && /^[a-z0-9_]{2,25}$/i.test(login)) out.twitchLogin = login.toLowerCase();

  const plan = httpsUrl(raw.planningUrl);
  if (plan && FRAME_HOSTS.has(new URL(plan).host)) out.planningUrl = plan;

  if (Array.isArray(raw.youtube)) {
    const seen = new Set();
    const yt = raw.youtube
      .map((c) => {
        const key = text(c && c.key, 30);
        const url = httpsUrl(c && c.url);
        if (!key || !KEY_RE.test(key) || !url || seen.has(key)) return null;
        seen.add(key);
        return { key, name: text(c.name) || key, handle: text(c.handle, 60) || "", url };
      })
      .filter(Boolean)
      .slice(0, 6);
    if (yt.length) out.youtube = yt;
  }

  if (Array.isArray(raw.socials)) {
    const so = raw.socials
      .map((s) => {
        const url = httpsUrl(s && s.url);
        const name = text(s && s.name);
        if (!url || !name) return null;
        const o = { name, url, icon: ICONS.has(s.icon) ? s.icon : "link" };
        const yk = text(s.ytKey, 30);
        if (yk && KEY_RE.test(yk)) o.ytKey = yk;
        return o;
      })
      .filter(Boolean)
      .slice(0, 8);
    if (so.length) out.socials = so;
  }

  const pm = Number(raw.pollMinutes);
  if (raw.pollMinutes !== undefined && Number.isFinite(pm)) out.pollMinutes = Math.min(60, Math.max(1, Math.round(pm)));

  return out;
}

async function readCache() {
  try {
    return (await chrome.storage.local.get(STORE_KEY))[STORE_KEY] || null;
  } catch (_) {
    return null;
  }
}

// Config a utiliser maintenant (instantane : lit la copie locale, jamais le reseau).
export async function getConfig() {
  const cached = await readCache();
  return { ...DEFAULTS, ...sanitize(cached && cached.data) };
}

// Rafraichit la copie distante si elle a plus de 15 min (ou tout de suite si force).
// Renvoie true si la config a change. En cas d'erreur, on garde la derniere copie connue.
export async function refreshConfig(force) {
  const cached = await readCache();
  if (!force && cached && Date.now() - (cached.fetchedAt || 0) < MAX_AGE) return false;
  try {
    const data = sanitize(await getRemoteConfig(force));
    const changed = JSON.stringify((cached && cached.data) || {}) !== JSON.stringify(data);
    await chrome.storage.local.set({ [STORE_KEY]: { data, fetchedAt: Date.now() } });
    return changed;
  } catch (e) {
    console.warn("config distante :", e.message);
    return false;
  }
}
