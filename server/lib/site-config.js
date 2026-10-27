// Config publique de l'extension, servie par GET /api/config.
//
// C'est ICI qu'on change les liens, les reseaux et les chaines YouTube.
// Apres un redeploiement Vercel, toutes les extensions installees la recuperent
// toutes seules (sous 15 minutes environ), sans nouvelle version sur le Chrome Web Store.
//
// Icones disponibles pour les reseaux : twitch, youtube, patreon, discord, instagram,
// tiktok, x, kick, threads, bluesky, link (icone generique).
// Pour une nouvelle icone, il faut en revanche une nouvelle version de l'extension.
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
    { key: "second", name: "ABDOU MP4", handle: "@abdou_mp4", url: "https://www.youtube.com/@abdou_mp4" }
  ],

  // Barre de reseaux (8 maximum). ytKey : affiche la vraie photo de profil de cette chaine.
  socials: [
    { name: "Twitch", url: "https://twitch.tv/tvabdou", icon: "twitch" },
    { name: "YouTube — HDKABDOU", url: "https://www.youtube.com/@hdkabdou", icon: "youtube", ytKey: "main" },
    { name: "YouTube — ABDOU MP4", url: "https://www.youtube.com/@abdou_mp4", icon: "youtube", ytKey: "second" },
    { name: "Patreon", url: "https://www.patreon.com/c/TVABDOU", icon: "patreon" },
    { name: "Discord", url: "https://discord.com/invite/SuN3YSHjAC", icon: "discord" }
  ],

  // Frequence de verification du live / des videos (minutes, 1 a 60).
  pollMinutes: 1
};
