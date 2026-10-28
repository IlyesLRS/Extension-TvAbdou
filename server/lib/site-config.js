// Config publique de l'extension, servie par GET /api/config.
//
// C'est ICI qu'on change les liens, les reseaux et les chaines YouTube.
// Apres un redeploiement Vercel, toutes les extensions installees la recuperent
// toutes seules (tout de suite dans la fenetre, sous 15 minutes pour les notifications),
// sans reinstaller l'extension.
//
// Icones disponibles pour les reseaux : twitch, youtube, patreon, discord, instagram,
// tiktok, x, kick, threads, bluesky, link (icone generique).
// Nouvelle icone : ajouter son SVG dans SOCIAL_SVG de server/public/popup/popup.js (sinon icone "link").
export const SITE_CONFIG = {
  twitchLogin: "tvabdou",

  // Planning integre en iframe. Le domaine doit rester planning-live.vercel.app
  // (seul domaine autorise par le manifest de l'extension).
  planningUrl: "https://planning-live.vercel.app/",

  // Chaines YouTube : onglet Videos + notifications.
  // La 1re chaine peut etre surchargee par YOUTUBE_HANDLE / YOUTUBE_CHANNEL_ID sur Vercel,
  // la 2e par YOUTUBE_HANDLE_2 / YOUTUBE_CHANNEL_ID_2, etc.
  // "key" : identifiant interne stable (ne pas changer celui d'une chaine existante,
  // sinon une notification "nouvelle video" partirait en double).
  youtube: [
    { key: "main", name: "HDKABDOU", handle: "@hdkabdou", url: "https://www.youtube.com/@hdkabdou" },
    { key: "second", name: "ABDOU MP4", handle: "@abdou_mp4", url: "https://www.youtube.com/@abdou_mp4" },
    { key: "react", name: "ABDOU EN REACT", handle: "@ABDOUENREACT", url: "https://www.youtube.com/@ABDOUENREACT" }
  ],

  // Barre de reseaux (8 maximum). ytKey : affiche la vraie photo de profil de cette chaine.
  socials: [
    { name: "Twitch", url: "https://twitch.tv/tvabdou", icon: "twitch" },
    { name: "YouTube — HDKABDOU", url: "https://www.youtube.com/@hdkabdou", icon: "youtube", ytKey: "main" },
    { name: "YouTube — ABDOU MP4", url: "https://www.youtube.com/@abdou_mp4", icon: "youtube", ytKey: "second" },
    { name: "YouTube — ABDOU EN REACT", url: "https://www.youtube.com/@ABDOUENREACT", icon: "youtube", ytKey: "react" },
    { name: "Patreon", url: "https://www.patreon.com/c/TVABDOU", icon: "patreon" },
    { name: "Discord", url: "https://discord.com/invite/SuN3YSHjAC", icon: "discord" }
  ],

  // Frequence de verification du live / des videos (minutes, 1 a 60).
  pollMinutes: 1,

  // Derniere version de l'extension elle-meme. L'interface (server/public/popup/) se met a jour
  // toute seule ; une nouvelle version n'est a publier que si on change ce qui tourne dans
  // l'extension (background.js, shell.js, manifest...). Dans ce cas : publier le zip en release
  // GitHub PUIS mettre ici le nouveau numero -> bandeau dans la fenetre + une notification.
  extension: {
    latestVersion: "1.2.0",
    downloadUrl: "https://github.com/IlyesLRS/Extension-TvAbdou/releases/latest"
  }
};
