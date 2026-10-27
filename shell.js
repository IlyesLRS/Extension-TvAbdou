// Fenetre de l'extension : affiche l'interface servie par le serveur dans un cadre,
// et lui prete les fonctions du navigateur qu'une page web n'a pas (reglage des
// notifications, verification immediate). Si le serveur ne repond pas, bascule sur
// la copie embarquee de l'interface (server/public/popup/ dans le dossier de l'extension).
import { CONFIG } from "./config.js";

// Version du pont ci-dessous, transmise a l'interface (?b=). A augmenter si on ajoute
// une fonction au pont : l'interface saura ainsi ce que l'extension installee sait faire.
const BRIDGE = 1;
const LOCAL_UI = "server/public/popup/index.html";
const TIMEOUT_MS = 3500;

const origin = new URL(CONFIG.proxyBase).origin;
const version = chrome.runtime.getManifest().version;
const frame = document.getElementById("ui");
let state = "loading"; // loading | remote | local
let timer = null;

function useLocal(reason) {
  if (state === "local") return;
  state = "local";
  clearTimeout(timer);
  console.warn("Interface du serveur indisponible (" + reason + ") : copie locale.");
  frame.src = chrome.runtime.getURL(LOCAL_UI) + "?v=" + encodeURIComponent(version);
}

// ---------- Pont : demandes de l'interface du serveur ----------
async function handle(m) {
  switch (m.type) {
    case "getNotif": {
      const d = await chrome.storage.local.get("notificationsEnabled");
      return d.notificationsEnabled !== false;
    }
    case "setNotif":
      await chrome.storage.local.set({ notificationsEnabled: Boolean(m.enabled) });
      return true;
    case "pollNow":
      await chrome.runtime.sendMessage({ type: "poll-now" }).catch(() => {});
      return true;
    default:
      throw new Error("Demande inconnue : " + m.type);
  }
}

window.addEventListener("message", async (e) => {
  // On n'ecoute que l'interface de notre serveur, chargee dans notre cadre.
  if (e.source !== frame.contentWindow || e.origin !== origin) return;
  const m = e.data || {};
  if (m.type === "hello" || m.type === "ready") {
    if (state === "loading") {
      state = "remote";
      clearTimeout(timer);
    }
    return;
  }
  if (m.type === "fallback") return useLocal(m.reason || "erreur");
  if (state !== "remote" || typeof m.id !== "number") return;
  let result, error;
  try {
    result = await handle(m);
  } catch (err) {
    error = err.message;
  }
  frame.contentWindow.postMessage({ id: m.id, result, error }, origin);
});

// ---------- Demarrage ----------
if (!navigator.onLine) {
  useLocal("hors ligne");
} else {
  // Page chargee mais muette (erreur 404, page d'erreur...) : on n'attend pas le delai complet.
  frame.addEventListener("load", () => {
    if (state === "loading") setTimeout(() => state === "loading" && useLocal("pas de réponse"), 700);
  });
  timer = setTimeout(() => state === "loading" && useLocal("délai dépassé"), TIMEOUT_MS);
  frame.src = origin + "/popup/?v=" + encodeURIComponent(version) + "&b=" + BRIDGE;
}
