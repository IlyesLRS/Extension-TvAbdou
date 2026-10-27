// Service worker : verifie le live et les nouvelles videos YouTube via le proxy,
// met a jour le badge (LIVE / OFF) et envoie des notifications.
// La config (liens, chaines, frequence) vient de lib/settings.js : copie embarquee
// + config distante du proxy, rafraichie toute seule.
import { getStatus, getLatestVideos, getPatreonPosts, isConfigured } from "./lib/api.js";
import { getConfig, refreshConfig } from "./lib/settings.js";

const ALARM = "tvabdou-poll";

// (Re)programme l'alarme seulement si la frequence a change (sinon le minuteur repartirait de zero).
async function schedule() {
  const { pollMinutes } = await getConfig();
  const period = Math.max(1, Number(pollMinutes) || 1);
  const current = await chrome.alarms.get(ALARM);
  if (!current || current.periodInMinutes !== period) {
    await chrome.alarms.create(ALARM, { periodInMinutes: period });
  }
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureDefaults();
  await refreshConfig(true);
  await schedule();
  await setOffline();
  poll();
});

chrome.runtime.onStartup.addListener(async () => {
  await schedule();
  poll();
});

chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === ALARM) poll();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "poll-now") {
    poll().then(() => sendResponse({ ok: true }));
    return true;
  }
});

async function ensureDefaults() {
  const d = await chrome.storage.local.get("notificationsEnabled");
  if (typeof d.notificationsEnabled === "undefined") {
    await chrome.storage.local.set({ notificationsEnabled: true });
  }
}

// ---------- Badge ----------
async function setLive() {
  await chrome.action.setIcon({
    path: { 16: "icons/icon-16.png", 32: "icons/icon-32.png", 48: "icons/icon-48.png", 128: "icons/icon-128.png" }
  });
  await chrome.action.setBadgeBackgroundColor({ color: "#B9E2CE" });
  await chrome.action.setBadgeTextColor?.({ color: "#16151c" });
  await chrome.action.setBadgeText({ text: "LIVE" });
  await chrome.action.setTitle({ title: "TVABDOU est EN LIVE !" });
}

async function setOffline() {
  await chrome.action.setIcon({
    path: { 16: "icons/off-16.png", 32: "icons/off-32.png", 48: "icons/off-48.png", 128: "icons/off-128.png" }
  });
  await chrome.action.setBadgeBackgroundColor({ color: "#8b8b93" });
  await chrome.action.setBadgeText({ text: "OFF" });
  await chrome.action.setTitle({ title: "TVABDOU est hors ligne" });
}

// ---------- Notifications ----------
async function notify(id, title, message, url) {
  const d = await chrome.storage.local.get("notificationsEnabled");
  if (d.notificationsEnabled === false) return;
  chrome.notifications.create(id, {
    type: "basic",
    iconUrl: "icons/icon-128.png",
    title,
    message,
    priority: 2
  });
  if (url) await chrome.storage.local.set({ ["notifUrl_" + id]: url });
}

chrome.notifications.onClicked.addListener(async (id) => {
  const d = await chrome.storage.local.get("notifUrl_" + id);
  const url = d["notifUrl_" + id];
  if (url) chrome.tabs.create({ url });
  chrome.notifications.clear(id);
});

// ---------- Nouvelle version de l'extension ----------
function cmpVersion(a, b) {
  const pa = String(a).split(".").map(Number);
  const pb = String(b).split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d) return d < 0 ? -1 : 1;
  }
  return 0;
}

// Une seule notification par nouvelle version (le bandeau reste affiche dans la fenetre).
async function checkExtensionUpdate(cfg) {
  const ext = cfg.extension;
  if (!ext || !ext.latestVersion) return;
  if (cmpVersion(chrome.runtime.getManifest().version, ext.latestVersion) >= 0) return;
  const { updateNotified } = await chrome.storage.local.get("updateNotified");
  if (updateNotified === ext.latestVersion) return;
  await chrome.storage.local.set({ updateNotified: ext.latestVersion });
  await notify(
    "update-" + ext.latestVersion,
    "Nouvelle version de l'extension TVABDOU ✨",
    "Clique pour installer la version " + ext.latestVersion + ".",
    ext.downloadUrl || undefined
  );
}

// ---------- Boucle ----------
async function poll() {
  if (!isConfigured()) {
    await chrome.action.setBadgeText({ text: "!" });
    await chrome.action.setBadgeBackgroundColor({ color: "#f5a623" });
    await chrome.action.setTitle({ title: "Proxy non configure (config.js)" });
    return;
  }

  // Config distante (au plus une requete toutes les 15 min).
  if (await refreshConfig()) await schedule();
  const CONFIG = await getConfig();

  // Nouvelle version de l'extension a installer (rare : l'interface, elle, se met a jour seule).
  await checkExtensionUpdate(CONFIG).catch(() => {});

  // --- Live ---
  try {
    const status = await getStatus();
    const prev = (await chrome.storage.local.get("wasLive")).wasLive || false;
    if (status.live && status.stream) {
      await setLive();
      if (!prev) {
        await notify(
          "live-" + Date.now(),
          "TVABDOU est EN LIVE ! 🔴",
          status.stream.title || "Rejoins le stream",
          "https://twitch.tv/" + CONFIG.twitchLogin
        );
      }
      await chrome.storage.local.set({ wasLive: true });
    } else {
      await setOffline();
      await chrome.storage.local.set({ wasLive: false });
    }
  } catch (e) {
    console.warn("poll live:", e.message);
  }

  // --- Nouvelle video YouTube (une verification par chaine) ---
  for (const ch of CONFIG.youtube) {
    try {
      const vids = await getLatestVideos(1, false, ch.key);
      if (!vids.length) continue;
      const latest = vids[0];
      // "main" garde l'ancienne cle de stockage : pas de notification en double a la mise a jour.
      const storeKey = ch.key === "main" ? "lastVideoId" : "lastVideoId_" + ch.key;
      const lastKnown = (await chrome.storage.local.get(storeKey))[storeKey];
      if (lastKnown && lastKnown !== latest.id) {
        const who = latest.channelTitle || ch.name || ch.handle;
        await notify("yt-" + latest.id, "Nouvelle video ! ▶️ " + who, latest.title, latest.url);
      }
      await chrome.storage.local.set({ [storeKey]: latest.id });
    } catch (e) {
      console.warn("poll youtube " + ch.key + ":", e.message);
    }
  }

  // --- Nouvelle publication Patreon ---
  try {
    const data = await getPatreonPosts();
    const posts = (data && data.posts) || [];
    if (data && data.configured !== false && posts.length) {
      const latest = posts[0];
      const key = latest.url || (latest.date + "|" + latest.title);
      const lastKnown = (await chrome.storage.local.get("lastPatreonKey")).lastPatreonKey;
      if (lastKnown && lastKnown !== key) {
        await notify(
          "patreon-" + Date.now(),
          "Nouvelle publication Patreon ! Ⓟ",
          latest.title || "Nouvelle publication",
          latest.url
        );
      }
      await chrome.storage.local.set({ lastPatreonKey: key });
    }
  } catch (e) {
    console.warn("poll patreon:", e.message);
  }
}
