// Service worker : verifie regulierement le live et les nouvelles videos YouTube,
// met a jour le badge (LIVE / OFF) et envoie des notifications.
import { CONFIG } from "./config.js";
import { getStreamStatus, getLatestVideos, isConfigured } from "./lib/api.js";

const ALARM = "tvabdou-poll";

// ---------- Installation ----------
chrome.runtime.onInstalled.addListener(async () => {
  await ensureDefaults();
  chrome.alarms.create(ALARM, { periodInMinutes: Math.max(1, CONFIG.pollMinutes) });
  await setOffline();
  poll();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(ALARM, { periodInMinutes: Math.max(1, CONFIG.pollMinutes) });
  poll();
});

chrome.alarms.onAlarm.addListener((a) => {
  if (a.name === ALARM) poll();
});

// Permet au popup de forcer un rafraichissement.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "poll-now") {
    poll().then(() => sendResponse({ ok: true }));
    return true; // reponse asynchrone
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
    path: {
      16: "icons/icon-16.png",
      32: "icons/icon-32.png",
      48: "icons/icon-48.png",
      128: "icons/icon-128.png"
    }
  });
  await chrome.action.setBadgeBackgroundColor({ color: "#e91916" });
  await chrome.action.setBadgeText({ text: "LIVE" });
  await chrome.action.setTitle({ title: "TVABDOU est EN LIVE !" });
}

async function setOffline() {
  await chrome.action.setIcon({
    path: {
      16: "icons/off-16.png",
      32: "icons/off-32.png",
      48: "icons/off-48.png",
      128: "icons/off-128.png"
    }
  });
  await chrome.action.setBadgeBackgroundColor({ color: "#555" });
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

// ---------- Boucle de verification ----------
async function poll() {
  if (!(await isConfigured())) {
    await chrome.action.setBadgeText({ text: "!" });
    await chrome.action.setBadgeBackgroundColor({ color: "#f5a623" });
    await chrome.action.setTitle({ title: "Configure les cles API (Options)" });
    return;
  }

  // --- Live ---
  try {
    const status = await getStreamStatus();
    const prev = (await chrome.storage.local.get("wasLive")).wasLive || false;
    if (status.live) {
      await setLive();
      if (!prev) {
        await notify(
          "live-" + Date.now(),
          "TVABDOU est EN LIVE ! 🔴",
          status.title || "Rejoins le stream",
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

  // --- Nouvelle video YouTube ---
  try {
    const vids = await getLatestVideos(1);
    if (vids.length) {
      const latest = vids[0];
      const lastKnown = (await chrome.storage.local.get("lastVideoId")).lastVideoId;
      if (lastKnown && lastKnown !== latest.id) {
        await notify(
          "yt-" + latest.id,
          "Nouvelle video YouTube ! ▶️",
          latest.title,
          latest.url
        );
      }
      await chrome.storage.local.set({ lastVideoId: latest.id });
    }
  } catch (e) {
    console.warn("poll youtube:", e.message);
  }
}
