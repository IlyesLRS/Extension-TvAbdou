// Ce que l'interface sait faire selon l'endroit ou elle tourne.
//
//  - mode "remote" : page servie par le serveur (https://extension-tvabdou.vercel.app/popup/)
//    et affichee dans la fenetre de l'extension (cadre cree par shell.js). C'est le cas normal :
//    toute modification de ce dossier est en ligne pour tout le monde des le redeploiement.
//    Les fonctions du navigateur (reglage des notifications, verification immediate) passent
//    par la fenetre parente via postMessage (voir shell.js a la racine de l'extension).
//
//  - mode "local" : copie embarquee dans l'extension, utilisee seulement si le serveur ne
//    repond pas. Elle a acces directement aux API chrome.*.
//
// Le parametre ?b= donne la version du pont de shell.js. Si une future interface a besoin
// d'une fonction que seul un pont plus recent connait, elle doit verifier BRIDGE avant de
// l'utiliser (les extensions deja installees gardent leur shell.js).
const params = new URLSearchParams(location.search);

export const MODE = location.protocol === "chrome-extension:" ? "local" : "remote";
export const BRIDGE = Number(params.get("b") || 0);
export const EXT_VERSION =
  params.get("v") || (MODE === "local" && globalThis.chrome && chrome.runtime ? chrome.runtime.getManifest().version : null);

const embedded = MODE === "remote" && window.parent !== window && BRIDGE >= 1;
const parentOrigin = (location.ancestorOrigins && location.ancestorOrigins[0]) || "*";

// ---------- Pont vers la fenetre de l'extension (mode remote) ----------
let seq = 0;
const pending = new Map();
if (embedded) {
  window.addEventListener("message", (e) => {
    if (e.source !== window.parent) return;
    const m = e.data || {};
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id);
    if (m.error) p.reject(new Error(m.error));
    else p.resolve(m.result);
  });
}

function call(type, data) {
  if (!embedded) return Promise.reject(new Error("Hors de l'extension"));
  return new Promise((resolve, reject) => {
    const id = ++seq;
    pending.set(id, { resolve, reject });
    window.parent.postMessage({ type, id, ...data }, parentOrigin);
    setTimeout(() => {
      if (pending.delete(id)) reject(new Error("L'extension ne répond pas"));
    }, 3000);
  });
}

// Des que tout le code de l'interface est charge, on previent shell.js (sinon, au bout de
// quelques secondes, il bascule sur la copie locale).
if (embedded) window.parent.postMessage({ type: "hello", ui: 1 }, parentOrigin);

// Previent shell.js que l'interface du serveur est prete.
export function announceReady() {
  if (embedded) window.parent.postMessage({ type: "ready", ui: 1 }, parentOrigin);
}
// Demande a shell.js de passer tout de suite sur la copie locale.
export function requestFallback(reason) {
  if (embedded) window.parent.postMessage({ type: "fallback", reason: String(reason || "") }, parentOrigin);
}

// ---------- Mode local : modules de l'extension (jamais charges en mode remote) ----------
let localMods = null;
async function local() {
  if (!localMods) {
    const [settings, config] = await Promise.all([import("../../../lib/settings.js"), import("../../../config.js")]);
    localMods = { settings, proxyBase: config.CONFIG.proxyBase };
  }
  return localMods;
}

// ---------- Mode remote : config lue directement sur le serveur ----------
let remoteJson = null;
let remoteData = null;
async function fetchRemoteConfig(bust) {
  const r = await fetch("/api/config" + (bust ? "?_=" + Date.now() : ""), bust ? { cache: "no-store" } : undefined);
  if (!r.ok) throw new Error("config " + r.status);
  const data = await r.json();
  const json = JSON.stringify(data);
  const changed = remoteJson !== null && remoteJson !== json;
  remoteJson = json;
  remoteData = data;
  return { data, changed };
}

export const platform = {
  mode: MODE,
  // Le bouton des notifications n'a de sens que si on peut joindre l'extension.
  hasBrowser: MODE === "local" || embedded,

  async proxyBase() {
    return MODE === "local" ? (await local()).proxyBase : location.origin;
  },

  async getConfig() {
    if (MODE === "local") return (await local()).settings.getConfig();
    return remoteData || (await fetchRemoteConfig(false)).data;
  },

  // Recharge la config ; renvoie true si elle a change depuis le dernier chargement.
  async refreshConfig(force) {
    if (MODE === "local") return (await local()).settings.refreshConfig(force);
    try {
      return (await fetchRemoteConfig(force)).changed;
    } catch (_) {
      return false;
    }
  },

  async getNotif() {
    if (MODE === "local") {
      const d = await chrome.storage.local.get("notificationsEnabled");
      return d.notificationsEnabled !== false;
    }
    return call("getNotif");
  },

  async setNotif(on) {
    if (MODE === "local") return chrome.storage.local.set({ notificationsEnabled: Boolean(on) });
    return call("setNotif", { enabled: Boolean(on) });
  },

  pollNow() {
    if (MODE === "local") return chrome.runtime.sendMessage({ type: "poll-now" }).catch(() => {});
    return call("pollNow").catch(() => {});
  }
};
