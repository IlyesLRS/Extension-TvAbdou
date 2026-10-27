<div align="center">

# TVABDOU — Live Tracker

**Extension navigateur (Chrome / Edge) pour suivre [TVABDOU](https://twitch.tv/tvabdou) en un coup d'œil.**

Sais si le stream est en live, affiche les derniers lives et temps forts, le planning,
les dernières vidéos des **2 chaînes YouTube** et les dernières publications Patreon —
avec notifications.

Lavande `#C9BCF1` · Menthe `#B9E2CE` · Noir & blanc en appui.

</div>

---

## ✨ Fonctionnalités

- 🔴 **Badge d'état** sur l'icône : `LIVE` (menthe) quand il stream, `OFF` sinon.
  L'icône est l'avatar de TVABDOU.
- 📺 **Onglet Live / Rediffs**
  - En live : miniature, titre, nombre de viewers et **durée du stream**.
  - Hors ligne : les **3 derniers lives passés et temps forts** (date, durée, vues).
    Les clips et les vidéos téléversées sont exclus.
- 📅 **Onglet Planning** : le planning [planning-live.vercel.app](https://planning-live.vercel.app/) intégré.
- ▶️ **Onglet Vidéos** : les **3 dernières vidéos de chaque chaîne YouTube** —
  [@hdkabdou](https://www.youtube.com/@hdkabdou) et
  [@abdou_mp4](https://www.youtube.com/@abdou_mp4) — en deux sections.
- Ⓟ **Onglet Patreon** : les **3 dernières publications Patreon**.
- 🔗 **Réseaux** (Twitch, les 2 chaînes YouTube avec leur vraie photo de profil,
  Patreon, Discord) accessibles sur chaque onglet.
- 🔔 **Notifications** au passage en live, à chaque nouvelle vidéo sur **l'une des deux
  chaînes YouTube** (le nom de la chaîne est indiqué) et à chaque nouvelle publication
  Patreon, avec un bouton pour les activer / couper.
- ↻ **Bouton Actualiser** pour recharger les données à la demande (sans cache).

> **Aucune clé API dans l'extension.** Les clés (Twitch, YouTube, Patreon) vivent
> dans un petit proxy Vercel ([`server/`](server/)) — l'utilisateur n'a rien à
> configurer, il installe et ça marche.

---

## 🚀 Installation

Installe l'extension depuis le **Chrome Web Store** (lien non répertorié :
*à ajouter ici après la première publication*), puis clique **Ajouter à Chrome**.
Ça marche aussi sur **Edge**.

L'icône TVABDOU apparaît dans la barre d'outils. ✅

### 🔄 Mises à jour : automatiques
Il n'y a **rien à faire** : Chrome vérifie les mises à jour du Web Store plusieurs fois
par jour et les installe tout seul. Et les liens, réseaux et chaînes YouTube changent
même **sans nouvelle version** : l'extension les récupère sur le serveur
(voir *Personnalisation*).

> **Tu avais installé une ancienne version en « non empaquetée » ?** Supprime-la dans
> `chrome://extensions` après avoir installé celle du Store, sinon tu recevras chaque
> notification en double.

### 🧪 Tester une version en développement
`chrome://extensions` → **Mode développeur** → **Charger l'extension non empaquetée** →
choisis ce dossier (celui qui contient `manifest.json`), puis **↻ Recharger** après chaque
modification.

---

## 🏗️ Architecture

```
extension-tvAbdou/
├── manifest.json        Manifest MV3
├── background.js        Service worker : badge LIVE/OFF, notifications (live/YouTube x2/Patreon), polling
├── popup.html/.css/.js  Interface (4 onglets + barre réseaux + bouton actualiser)
├── config.js            proxyBase + copie de secours de la config (liens, chaînes, planning)
├── lib/
│   ├── api.js           Appels au proxy Vercel
│   └── settings.js      Config effective : config distante du serveur, sinon config.js
├── icons/               Avatar + icônes d'état
├── scripts/build.mjs    Construit le zip pour le Chrome Web Store (npm run build)
├── store/               Fiche Chrome Web Store : textes, captures, vignette
└── server/              Proxy serverless Vercel (garde les clés API)
    ├── vercel.json      Cron quotidien Patreon + adresse /confidentialite
    ├── lib/
    │   ├── site-config.js  ⭐ Liens, réseaux, chaînes YouTube (servis à l'extension)
    │   ├── twitch.js    Helper Twitch Helix
    │   ├── youtube.js   Helper YouTube (multi-chaînes)
    │   ├── patreon.js   Jeton Patreon + renouvellement automatique
    │   ├── store.js     Stockage du jeton Patreon dans Supabase
    │   └── alert.js     Alerte Discord si Patreon casse
    └── api/
        ├── config.js    Config publique de l'extension
        ├── status.js    Live + 3 derniers lives/temps forts (Twitch Helix)
        ├── videos.js    3 dernières vidéos par chaîne (YouTube Data API)
        ├── channels.js  Nom + photo de profil des chaînes YouTube
        ├── patreon.js   3 dernières publications (Patreon API)
        ├── privacy.js   Politique de confidentialité (/confidentialite)
        └── cron/patreon.js  Renouvellement + vérification Patreon, 1 fois par jour
```

L'extension ne parle qu'au **proxy** ; le proxy détient les clés (variables
d'environnement Vercel) et n'expose que des données publiques.

---

## ⚙️ Configuration du proxy (une seule fois)

Voir [`server/README.md`](server/README.md) pour le détail. En résumé :

1. Importe le dossier `server/` sur [Vercel](https://vercel.com/new)
   (**Root Directory = `server`**).
2. Ajoute les variables d'environnement :

   | Variable | Rôle |
   |----------|------|
   | `TWITCH_CLIENT_ID` | Twitch (live + VOD) |
   | `TWITCH_CLIENT_SECRET` | Twitch |
   | `YOUTUBE_API_KEY` | YouTube (onglet Vidéos + notifs) |
   | `PATREON_ACCESS_TOKEN` + `PATREON_CLIENT_ID` / `_SECRET` / `PATREON_REFRESH_TOKEN` | Patreon (onglet Patreon, avec renouvellement automatique du jeton) |
   | `SUPABASE_URL` + `SUPABASE_SECRET_KEY` | Stockage durable du jeton Patreon (projet Supabase reseaux-tvabdou) |
   | `DISCORD_WEBHOOK_URL` | Alerte Discord si l'accès Patreon casse *(optionnel)* |
   | `CRON_SECRET` | Protège le cron quotidien *(optionnel, recommandé)* |

3. Déploie, puis renseigne l'URL du proxy dans [`config.js`](config.js) (`proxyBase`).

---

## 🎨 Personnalisation (sans nouvelle version)

Les liens, réseaux, chaînes YouTube, le planning et la fréquence de vérification se
changent dans [`server/lib/site-config.js`](server/lib/site-config.js). Après le
redéploiement Vercel, **toutes les extensions installées les récupèrent toutes seules**
(sous 15 minutes environ) : pas de nouvelle version à publier.

- **Ajouter un réseau** : une ligne dans `socials` (icônes disponibles : twitch, youtube,
  patreon, discord, instagram, tiktok, x, kick, threads, bluesky, link).
- **Ajouter une chaîne YouTube** : une entrée dans `youtube` (avec une `key` nouvelle).
  L'onglet Vidéos et les notifications la prennent en compte automatiquement.

[`config.js`](config.js) ne sert plus que de copie de secours (et pour `proxyBase`).
Une nouvelle version sur le Store n'est nécessaire que pour changer le code ou le design.

---

## 📦 Publier une nouvelle version

Tout est détaillé dans [`store/fiche-chrome-web-store.md`](store/fiche-chrome-web-store.md).
En résumé : augmente `version` dans `manifest.json`, lance `npm run build`, puis envoie
`dist/Extension-TvAbdou-vX.Y.Z.zip` sur le tableau de bord du Chrome Web Store. Après la
vérification de Google, tout le monde est mis à jour automatiquement.

---

## 🔒 Sécurité

Les clés API ne sont **jamais** dans l'extension ni sur GitHub : elles restent dans
les variables d'environnement Vercel, côté serveur. Le proxy n'expose que des
données publiques (statut live, VOD, vidéos, publications). Le jeton Patreon courant est
rangé dans une table Supabase privée, accessible seulement avec la clé secrète du serveur.
L'extension ne collecte aucune donnée personnelle
([politique de confidentialité](https://extension-tvabdou.vercel.app/confidentialite)).
