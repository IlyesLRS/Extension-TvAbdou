// Configuration de l'extension.
// Aucune cle API ici : tout passe par le proxy Vercel (dossier /server).
export const CONFIG = {
  // Proxy Vercel (garde les cles API cote serveur).
  proxyBase: "https://extension-tvabdou.vercel.app",

  twitchLogin: "tvabdou",

  // Planning integre en iframe (Vercel + Supabase).
  planningUrl: "https://planning-live.vercel.app/",

  // Reseaux sociaux affiches sous le live.
  socials: [
    { name: "Twitch",  url: "https://twitch.tv/tvabdou",         icon: "twitch"  },
    { name: "YouTube", url: "https://www.youtube.com/@dikabdou", icon: "youtube" },
    { name: "Patreon", url: "https://www.patreon.com/c/TVABDOU", icon: "patreon" },
    { name: "Discord", url: "https://discord.gg/Pz7bmEyj6m",     icon: "discord" }
  ],

  // Frequence de verification du live / des videos (minutes).
  pollMinutes: 1
};
