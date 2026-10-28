// Configuration embarquee de l'extension = COPIE DE SECOURS.
// Les liens, reseaux, chaines YouTube, planning et frequence se changent cote serveur,
// dans server/lib/site-config.js : l'extension les recupere toute seule (lib/settings.js)
// et n'utilise ces valeurs que si le serveur n'a encore jamais repondu.
// Seul proxyBase doit imperativement etre juste ici.
// Aucune cle API ici : tout passe par le proxy Vercel (dossier /server).
export const CONFIG = {
  // Proxy Vercel (garde les cles API cote serveur).
  proxyBase: "https://extension-tvabdou.vercel.app",

  twitchLogin: "tvabdou",

  // Planning integre en iframe (Vercel + Supabase).
  planningUrl: "https://planning-live.vercel.app/",

  // Chaines YouTube suivies (onglet Videos + notifications).
  // "key" doit correspondre aux cles cote proxy (server/lib/site-config.js).
  youtube: [
    { key: "main",   name: "HDKABDOU",  handle: "@hdkabdou",  url: "https://www.youtube.com/@hdkabdou"  },
    { key: "second", name: "ABDOU MP4", handle: "@abdou_mp4", url: "https://www.youtube.com/@abdou_mp4" },
    { key: "react",  name: "ABDOU EN REACT", handle: "@ABDOUENREACT", url: "https://www.youtube.com/@ABDOUENREACT" }
  ],

  // Reseaux sociaux affiches sous le live.
  // ytKey : relie l'icone a une chaine YouTube (affiche sa vraie photo de profil).
  socials: [
    { name: "Twitch",  url: "https://twitch.tv/tvabdou",          icon: "twitch"  },
    { name: "YouTube — HDKABDOU",  url: "https://www.youtube.com/@hdkabdou",  icon: "youtube", ytKey: "main"   },
    { name: "YouTube — ABDOU MP4", url: "https://www.youtube.com/@abdou_mp4", icon: "youtube", ytKey: "second" },
    { name: "YouTube — ABDOU EN REACT", url: "https://www.youtube.com/@ABDOUENREACT", icon: "youtube", ytKey: "react" },
    { name: "Patreon", url: "https://www.patreon.com/c/TVABDOU",  icon: "patreon" },
    { name: "Discord", url: "https://discord.com/invite/SuN3YSHjAC", icon: "discord" }
  ],

  // Frequence de verification du live / des videos (minutes).
  pollMinutes: 1
};
