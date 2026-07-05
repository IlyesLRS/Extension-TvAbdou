// Configuration du streamer et des reseaux sociaux.
// Les cles API (Twitch / YouTube) se configurent dans la page Options.
export const CONFIG = {
  // Twitch
  twitchLogin: "tvabdou",

  // YouTube : on utilise le "handle" (@...) pour retrouver la chaine.
  youtubeHandle: "@dikabdou",

  // Reseaux sociaux affiches en bas du popup.
  socials: [
    { name: "Twitch",  url: "https://twitch.tv/tvabdou",             icon: "twitch"  },
    { name: "YouTube", url: "https://www.youtube.com/@dikabdou",     icon: "youtube" },
    { name: "Patreon", url: "https://www.patreon.com/c/TVABDOU",     icon: "patreon" },
    { name: "Discord", url: "https://discord.gg/Pz7bmEyj6m",         icon: "discord" }
  ],

  // Frequence de verification du live / des videos (minutes).
  pollMinutes: 1
};
