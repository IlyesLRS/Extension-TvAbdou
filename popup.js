import { CONFIG } from "./config.js";
import {
  getStreamStatus,
  getLastVod,
  getSchedule,
  getLatestVideos,
  isConfigured
} from "./lib/api.js";

// ---------- Helpers de formatage ----------
function pad(n) { return String(n).padStart(2, "0"); }

// Duree ecoulee depuis une date ISO -> "2h27min"
function uptime(iso) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h${pad(m)}` : `${m}min`;
}

// Duree Twitch "3h25m40s" -> "3h25min"
function fmtVodDuration(d) {
  if (!d) return "";
  const h = /(\d+)h/.exec(d);
  const m = /(\d+)m/.exec(d);
  const s = /(\d+)s/.exec(d);
  if (h) return `${h[1]}h${pad(m ? m[1] : 0)}min`;
  if (m) return `${m[1]}min${pad(s ? s[1] : 0)}`;
  return d;
}

// Date relative -> "il y a 2 jours"
function relative(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const day = 86400000;
  if (diff < 3600000) return "il y a " + Math.floor(diff / 60000) + " min";
  if (diff < day) return "il y a " + Math.floor(diff / 3600000) + " h";
  const days = Math.floor(diff / day);
  if (days === 1) return "hier";
  if (days < 7) return "il y a " + days + " jours";
  if (days < 30) return "il y a " + Math.floor(days / 7) + " sem.";
  return "il y a " + Math.floor(days / 30) + " mois";
}

function fmtNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(".0", "") + "M";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(".0", "") + "k";
  return String(n);
}

const MONTHS = ["JAN","FÉV","MAR","AVR","MAI","JUIN","JUIL","AOÛT","SEP","OCT","NOV","DÉC"];

// ---------- Icones reseaux (SVG inline) ----------
const SOCIAL_SVG = {
  twitch: '<svg viewBox="0 0 24 24" fill="#9146ff"><path d="M2.149 0L.537 4.119v16.836h5.731V24h3.224l3.045-3.045h4.657L23.463 15V0H2.149zm19.164 14.045l-3.582 3.582h-5.731l-3.045 3.045v-3.045H4.687V1.79h16.626v12.255zm-3.582-7.373v5.731h-2.149V6.672h2.149zm-5.731 0v5.731H9.851V6.672h2.149z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24" fill="#ff0000"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>',
  patreon: '<svg viewBox="0 0 24 24" fill="#ff424d"><path d="M14.82 2.41c3.96 0 7.18 3.24 7.18 7.21 0 3.96-3.22 7.18-7.18 7.18-3.97 0-7.21-3.22-7.21-7.18 0-3.97 3.24-7.21 7.21-7.21M2 21.6h3.5V2.41H2V21.6z"/></svg>',
  discord: '<svg viewBox="0 0 24 24" fill="#5865f2"><path d="M20.317 4.369a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.369a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.891.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.056c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>'
};

// ---------- Rendu : Live / VOD ----------
async function renderLive() {
  const el = document.getElementById("liveContent");
  const pill = document.getElementById("statusPill");
  try {
    const status = await getStreamStatus();
    if (status.live) {
      pill.textContent = "EN LIVE";
      pill.className = "pill live";
      el.innerHTML = `
        <div class="stream-card">
          <a class="thumb-wrap" href="https://twitch.tv/${status.login}" target="_blank">
            ${status.thumbnail ? `<img src="${status.thumbnail}?_=${Date.now()}" alt="">` : ""}
            <span class="badge-live">● LIVE</span>
            <span class="badge-time">⏱ ${uptime(status.startedAt)}</span>
          </a>
          <div class="card-body">
            <div class="card-title">${escapeHtml(status.title || "")}</div>
            <div class="meta-row">
              <span>👁 <b>${fmtNumber(status.viewers)}</b> viewers</span>
              ${status.game ? `<span>🎮 ${escapeHtml(status.game)}</span>` : ""}
            </div>
            <a class="watch-btn" href="https://twitch.tv/${status.login}" target="_blank">Regarder le live</a>
          </div>
        </div>`;
    } else {
      pill.textContent = "HORS LIGNE";
      pill.className = "pill off";
      const vod = await getLastVod();
      if (!vod) {
        el.innerHTML = `<div class="empty">Aucune VOD disponible.</div>`;
      } else {
        el.innerHTML = `
          <div class="section-label">Dernière VOD</div>
          <div class="stream-card">
            <a class="thumb-wrap" href="${vod.url}" target="_blank">
              ${vod.thumbnail ? `<img src="${vod.thumbnail}" alt="">` : ""}
              <span class="badge-time">⏱ ${fmtVodDuration(vod.duration)}</span>
            </a>
            <div class="card-body">
              <div class="card-title">${escapeHtml(vod.title)}</div>
              <div class="meta-row">
                <span>📅 <b>${relative(vod.date)}</b></span>
                <span>👁 <b>${fmtNumber(vod.views)}</b> vues</span>
              </div>
              <a class="watch-btn" href="${vod.url}" target="_blank">Voir la VOD</a>
            </div>
          </div>`;
      }
    }
  } catch (e) {
    el.innerHTML = `<div class="error">Erreur : ${escapeHtml(e.message)}</div>`;
  }
}

// ---------- Rendu : Planning ----------
async function renderPlanning() {
  const el = document.getElementById("planningContent");
  try {
    const segs = await getSchedule();
    if (!segs.length) {
      el.innerHTML = `<div class="empty">Aucun planning configuré sur Twitch pour le moment.</div>`;
      return;
    }
    el.innerHTML = segs.map((s) => {
      const d = new Date(s.start);
      const time = pad(d.getHours()) + "h" + pad(d.getMinutes());
      const weekday = d.toLocaleDateString("fr-FR", { weekday: "long" });
      return `
        <div class="sched-item ${s.canceled ? "sched-canceled" : ""}">
          <div class="sched-date">
            <div class="d">${d.getDate()}</div>
            <div class="m">${MONTHS[d.getMonth()]}</div>
          </div>
          <div class="sched-info">
            <strong>${escapeHtml(s.title)}</strong>
            <span>${weekday} • ${time}${s.category ? " • " + escapeHtml(s.category) : ""}${s.canceled ? " • ANNULÉ" : ""}</span>
          </div>
        </div>`;
    }).join("");
  } catch (e) {
    el.innerHTML = `<div class="error">Erreur : ${escapeHtml(e.message)}</div>`;
  }
}

// ---------- Rendu : Videos ----------
async function renderVideos() {
  const el = document.getElementById("videosContent");
  try {
    const vids = await getLatestVideos(3);
    if (!vids.length) {
      el.innerHTML = `<div class="empty">Aucune vidéo trouvée.<br>Vérifie la clé YouTube dans les Options.</div>`;
      return;
    }
    el.innerHTML = vids.map((v) => `
      <a class="video-item" href="${v.url}" target="_blank">
        ${v.thumbnail ? `<img src="${v.thumbnail}" alt="">` : ""}
        <div class="video-meta">
          <strong>${escapeHtml(v.title)}</strong>
          <span>${relative(v.date)}</span>
        </div>
      </a>`).join("");
  } catch (e) {
    el.innerHTML = `<div class="error">Erreur : ${escapeHtml(e.message)}</div>`;
  }
}

// ---------- Reseaux sociaux ----------
function renderSocials() {
  const el = document.getElementById("socials");
  el.innerHTML = CONFIG.socials.map((s) => `
    <a class="social ${s.icon}" href="${s.url}" target="_blank" title="${s.name}">
      ${SOCIAL_SVG[s.icon] || ""}
      <span>${s.name}</span>
    </a>`).join("");
}

// ---------- Notifications toggle ----------
async function initNotifToggle() {
  const btn = document.getElementById("notifToggle");
  const state = document.getElementById("notifState");
  async function refresh() {
    const d = await chrome.storage.local.get("notificationsEnabled");
    const on = d.notificationsEnabled !== false;
    state.textContent = on ? "ON" : "OFF";
    btn.classList.toggle("off", !on);
  }
  btn.addEventListener("click", async () => {
    const d = await chrome.storage.local.get("notificationsEnabled");
    const on = d.notificationsEnabled !== false;
    await chrome.storage.local.set({ notificationsEnabled: !on });
    refresh();
  });
  refresh();
}

// ---------- Onglets ----------
const loaded = {};
function initTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".panel").forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      const name = tab.dataset.tab;
      document.getElementById("tab-" + name).classList.add("active");
      lazyLoad(name);
    });
  });
}

function lazyLoad(name) {
  if (loaded[name]) return;
  loaded[name] = true;
  if (name === "planning") renderPlanning();
  if (name === "videos") renderVideos();
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// ---------- Init ----------
document.getElementById("openOptions").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

(async function init() {
  renderSocials();
  initTabs();
  initNotifToggle();

  if (!(await isConfigured())) {
    document.getElementById("liveContent").innerHTML =
      `<div class="empty">⚙️ Configuration requise.<br>
       Ajoute tes clés API Twitch (et YouTube) dans les
       <a href="#" id="cfgLink">Options</a>.</div>`;
    document.getElementById("cfgLink").addEventListener("click", (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
    return;
  }

  loaded.live = true;
  renderLive();
  // demande au background de rafraichir le badge tout de suite
  chrome.runtime.sendMessage({ type: "poll-now" }).catch(() => {});
})();
